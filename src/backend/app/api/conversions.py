"""
変換API
PDF変換のCRUD、ダウンロード
"""
import json
import threading
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, UploadFile, File, Form
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import io

from app.api.deps import get_db, get_current_user
from app.models import User
from app.infrastructure.database import SessionLocal
from app.schemas import (
    ApiResponse, ConversionResponse, ConversionDetailResponse,
    ConversionListResponse, ConversionUploadResponse, ConversionGenerateResponse,
    ConversionUpdateRequest, ConversionApproveResponse, ImageResponse
)
from app.schemas.conversion import TemplateSimple
from app.services import ConversionService, SettingsService
from app.converters import ConverterManager
from app.infrastructure.file_storage import file_storage
from app.core.exceptions import (
    ConversionNotFoundException, TemplateNotReadyException,
    FileTooLargeException, InvalidFileTypeException
)

router = APIRouter(prefix="/conversions", tags=["変換"])


@router.get("", response_model=ApiResponse[ConversionListResponse])
def get_conversions(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """変換一覧取得"""
    conversion_service = ConversionService(db)
    conversions, total = conversion_service.get_list(
        user_id=current_user.id,
        status=status,
        page=page,
        limit=limit
    )

    return ApiResponse.ok(
        data=ConversionListResponse(
            items=[ConversionResponse.model_validate(c) for c in conversions],
            total=total,
            page=page,
            limit=limit,
            has_next=(page * limit) < total
        )
    )


@router.post("", response_model=ApiResponse[ConversionUploadResponse])
async def create_conversion(
    file: UploadFile = File(...),
    template_id: int = Form(...),
    converter_type: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """変換作成（PDFアップロード）- フロントエンド互換"""
    try:
        # ファイル内容を読み込み
        content = await file.read()

        conversion_service = ConversionService(db)
        conversion = conversion_service.create(
            user_id=current_user.id,
            template_id=template_id,
            filename=file.filename,
            file_content=content,
            requested_converter=converter_type
        )

        # ページ数を取得
        converter = ConverterManager()
        pdf_path = file_storage.get_file_path(conversion.pdf_path)
        if pdf_path:
            conversion.page_count = converter.get_page_count(str(pdf_path))
            db.commit()

        return ApiResponse.ok(
            data=ConversionUploadResponse(
                id=conversion.id,
                template_id=conversion.template_id,
                original_filename=conversion.original_filename,
                page_count=conversion.page_count,
                status=conversion.status,
                created_at=conversion.created_at
            ),
            message="PDFをアップロードしました"
        )
    except TemplateNotReadyException as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})
    except FileTooLargeException as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})
    except InvalidFileTypeException as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})


@router.post("/upload", response_model=ApiResponse[ConversionUploadResponse])
async def upload_pdf(
    file: UploadFile = File(...),
    template_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """PDFアップロード（レガシーエンドポイント）"""
    try:
        # ファイル内容を読み込み
        content = await file.read()

        conversion_service = ConversionService(db)
        conversion = conversion_service.create(
            user_id=current_user.id,
            template_id=template_id,
            filename=file.filename,
            file_content=content
        )

        # ページ数を取得
        converter = ConverterManager()
        pdf_path = file_storage.get_file_path(conversion.pdf_path)
        if pdf_path:
            conversion.page_count = converter.get_page_count(str(pdf_path))
            db.commit()

        return ApiResponse.ok(
            data=ConversionUploadResponse(
                id=conversion.id,
                template_id=conversion.template_id,
                original_filename=conversion.original_filename,
                page_count=conversion.page_count,
                status=conversion.status,
                created_at=conversion.created_at
            ),
            message="PDFをアップロードしました"
        )
    except TemplateNotReadyException as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})
    except FileTooLargeException as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})
    except InvalidFileTypeException as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})


@router.get("/{conversion_id}", response_model=ApiResponse[ConversionDetailResponse])
def get_conversion(
    conversion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """変換詳細取得"""
    try:
        conversion_service = ConversionService(db)
        conversion = conversion_service.get_by_id(conversion_id, current_user.id)

        return ApiResponse.ok(
            data=ConversionDetailResponse(
                id=conversion.id,
                template_id=conversion.template_id,
                original_filename=conversion.original_filename,
                status=conversion.status,
                page_count=conversion.page_count,
                converter_used=conversion.converter_used,
                generated_html=conversion.generated_html,
                template=TemplateSimple(
                    id=conversion.template.id,
                    name=conversion.template.name
                ),
                images=[ImageResponse.model_validate(img) for img in conversion.images],
                error_message=conversion.error_message,
                approved_at=conversion.approved_at,
                created_at=conversion.created_at,
                updated_at=conversion.updated_at
            )
        )
    except ConversionNotFoundException as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})


@router.post("/{conversion_id}/generate", response_model=ApiResponse[ConversionGenerateResponse])
async def generate_html(
    conversion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """HTML生成"""
    try:
        conversion_service = ConversionService(db)
        conversion = conversion_service.get_by_id(conversion_id, current_user.id)
        user_id = current_user.id  # バックグラウンドタスク用にIDを保存

        # バックグラウンドスレッドで変換実行（即座にレスポンスを返す）
        def run_conversion():
            bg_db = SessionLocal()
            try:
                bg_conversion_service = ConversionService(bg_db)
                bg_settings_service = SettingsService(bg_db)
                bg_conversion = bg_conversion_service.get_by_id(conversion_id, user_id)
                bg_user_settings = bg_settings_service.get_or_create(user_id)

                _process_conversion(bg_db, bg_conversion, bg_user_settings)
            except Exception as e:
                logging.error(f"Background conversion failed: {e}")
            finally:
                bg_db.close()

        # スレッドでバックグラウンド実行（メインスレッドをブロックしない）
        thread = threading.Thread(target=run_conversion, daemon=True)
        thread.start()

        return ApiResponse.ok(
            data=ConversionGenerateResponse(
                id=conversion.id,
                status="converting",
                message="HTML生成を開始しました"
            )
        )
    except ConversionNotFoundException as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})


def _insert_images_to_html(html: str, image_urls: list, conversion_id: int) -> str:
    """HTMLに画像タグを挿入"""
    if not image_urls:
        return html

    # 画像セクションを生成
    images_html = '<div class="pdf-images">\n'
    for img in sorted(image_urls, key=lambda x: (x["page"], x["order"])):
        images_html += f'  <figure class="pdf-image" data-page="{img["page"]}">\n'
        images_html += f'    <img src="/api/conversions/{conversion_id}/images/{img["filename"]}" '
        images_html += f'alt="Page {img["page"]} Image {img["order"]}" '
        if img.get("width") and img.get("height"):
            images_html += f'width="{img["width"]}" height="{img["height"]}" '
        images_html += 'loading="lazy" />\n'
        images_html += '  </figure>\n'
    images_html += '</div>\n'

    # </article>タグの前に挿入、なければ末尾に追加
    if '</article>' in html:
        html = html.replace('</article>', f'{images_html}</article>')
    elif '</body>' in html:
        html = html.replace('</body>', f'{images_html}</body>')
    else:
        html += images_html

    return html


def _process_conversion(db: Session, conversion, user_settings):
    """変換処理（バックグラウンドスレッドで実行）"""
    import asyncio
    from app.services import ConversionService, HtmlGeneratorService
    from app.services.template_service import TemplateService
    from app.core.security import security_service

    conversion_service = ConversionService(db)
    conversion_service.set_converting_status(conversion)

    try:
        # APIキー復号
        openai_key = ""
        anthropic_key = ""
        if user_settings.openai_api_key_enc:
            openai_key = security_service.decrypt_api_key(user_settings.openai_api_key_enc) or ""
        if user_settings.anthropic_api_key_enc:
            anthropic_key = security_service.decrypt_api_key(user_settings.anthropic_api_key_enc) or ""

        # コンバーター設定（requested_converterを優先）
        converter_type = conversion.requested_converter or user_settings.current_converter
        converter_manager = ConverterManager(
            openai_api_key=openai_key,
            anthropic_api_key=anthropic_key,
            openai_model=user_settings.openai_model,
            anthropic_model=user_settings.anthropic_model,
            default_converter=converter_type
        )

        # PDF変換（テキスト抽出）
        pdf_path = file_storage.get_file_path(conversion.pdf_path)
        result = converter_manager.convert(str(pdf_path))

        # 画像保存（URLリストを収集）
        image_urls = []
        for img in result.images:
            ext = img.mime_type.split("/")[-1]
            filename = f"page{img.page_number}_{img.order_in_page}.{ext}"
            img_path = file_storage.save_image(conversion.id, filename, img.data)

            # HTMLに挿入するための情報を記録
            image_urls.append({
                "page": img.page_number,
                "order": img.order_in_page,
                "filename": filename,
                "width": img.width,
                "height": img.height
            })

            conversion_service.add_image(
                conversion_id=conversion.id,
                filename=filename,
                file_path=img_path,
                page_number=img.page_number,
                order_in_page=img.order_in_page,
                width=img.width,
                height=img.height,
                file_size=len(img.data),
                mime_type=img.mime_type
            )

        # テンプレートを取得
        template_service = TemplateService(db)
        template = template_service.get_by_id(conversion.template_id, conversion.user_id)

        # LLMでスタイル付きHTML生成
        html_generator = HtmlGeneratorService(db)
        try:
            # 非同期関数を同期的に実行
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                html = loop.run_until_complete(
                    html_generator.generate_styled_html(result.text, template, user_settings)
                )
            finally:
                loop.close()
        except Exception as e:
            logging.warning(f"LLM HTML generation failed, using basic conversion: {e}")
            # フォールバック: 基本的なHTML化
            html = html_generator._basic_html_wrap(result.text)

        # 画像タグをHTMLに挿入
        if image_urls:
            html = _insert_images_to_html(html, image_urls, conversion.id)

        conversion_service.set_converted_status(
            conversion,
            html=html,
            converter_used=converter_type,
            page_count=result.page_count
        )

    except Exception as e:
        logging.error(f"Conversion failed: {e}")
        conversion_service.set_error_status(conversion, str(e))


@router.patch("/{conversion_id}", response_model=ApiResponse[dict])
def update_conversion(
    conversion_id: int,
    data: ConversionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """HTML編集保存"""
    try:
        conversion_service = ConversionService(db)
        conversion = conversion_service.update_html(conversion_id, current_user.id, data.generated_html)

        return ApiResponse.ok(
            data={"id": conversion.id, "updated_at": conversion.updated_at},
            message="HTMLを保存しました"
        )
    except ConversionNotFoundException as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})


@router.post("/{conversion_id}/approve", response_model=ApiResponse[ConversionApproveResponse])
def approve_conversion(
    conversion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """変換を承認"""
    try:
        conversion_service = ConversionService(db)
        conversion = conversion_service.approve(conversion_id, current_user.id)

        return ApiResponse.ok(
            data=ConversionApproveResponse(
                id=conversion.id,
                status=conversion.status,
                approved_at=conversion.approved_at
            ),
            message="変換結果を承認しました"
        )
    except ConversionNotFoundException as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})


@router.get("/{conversion_id}/html")
def get_html(
    conversion_id: int,
    embed_images: bool = Query(True, description="画像をBase64で埋め込む（プレビュー用）"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """HTMLプレビュー取得"""
    import re
    import base64

    try:
        conversion_service = ConversionService(db)
        conversion = conversion_service.get_by_id(conversion_id, current_user.id)

        if not conversion.generated_html:
            raise HTTPException(status_code=400, detail={"code": "NO_HTML", "message": "HTMLが生成されていません"})

        html = conversion.generated_html

        # プレビュー用: 画像URLをBase64データURLに変換
        if embed_images:
            # /api/conversions/{id}/images/{filename} パターンを検索
            img_pattern = r'<img([^>]*?)src="/api/conversions/(\d+)/images/([^"]+)"([^>]*?)>'

            def replace_with_base64(match):
                prefix = match.group(1)
                img_conversion_id = match.group(2)
                filename = match.group(3)
                suffix = match.group(4)

                # 画像ファイルを読み込み
                image_data = file_storage.get_file(f"images/{img_conversion_id}/{filename}")
                if image_data:
                    # MIMEタイプ判定
                    ext = filename.split(".")[-1].lower()
                    mime_types = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif"}
                    mime_type = mime_types.get(ext, "image/png")

                    # Base64エンコード
                    b64_data = base64.b64encode(image_data).decode('utf-8')
                    return f'<img{prefix}src="data:{mime_type};base64,{b64_data}"{suffix}>'
                else:
                    # 画像が見つからない場合は元のタグを維持
                    return match.group(0)

            html = re.sub(img_pattern, replace_with_base64, html)

        return Response(
            content=html,
            media_type="text/html"
        )
    except ConversionNotFoundException as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})


@router.get("/{conversion_id}/download")
def download_html(
    conversion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """HTMLダウンロード"""
    try:
        conversion_service = ConversionService(db)
        conversion = conversion_service.get_by_id(conversion_id, current_user.id)

        if not conversion.generated_html:
            raise HTTPException(status_code=400, detail={"code": "NO_HTML", "message": "HTMLが生成されていません"})

        return Response(
            content=conversion.generated_html,
            media_type="text/html",
            headers={
                "Content-Disposition": f'attachment; filename="output.html"'
            }
        )
    except ConversionNotFoundException as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})


@router.get("/{conversion_id}/images")
def download_images(
    conversion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """画像ZIP取得"""
    try:
        conversion_service = ConversionService(db)
        conversion = conversion_service.get_by_id(conversion_id, current_user.id)

        zip_data = file_storage.create_images_zip(conversion_id)
        if not zip_data:
            raise HTTPException(status_code=400, detail={"code": "NO_IMAGES", "message": "画像がありません"})

        return Response(
            content=zip_data,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="images.zip"'
            }
        )
    except ConversionNotFoundException as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})


@router.get("/{conversion_id}/images/{filename}")
def get_image(
    conversion_id: int,
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """個別画像取得"""
    try:
        # 認証・認可チェック
        conversion_service = ConversionService(db)
        conversion = conversion_service.get_by_id(conversion_id, current_user.id)

        # 画像ファイルを取得
        image_data = file_storage.get_file(f"images/{conversion_id}/{filename}")
        if not image_data:
            raise HTTPException(status_code=404, detail={"code": "IMAGE_NOT_FOUND", "message": "画像が見つかりません"})

        # MIMEタイプ判定
        ext = filename.split(".")[-1].lower()
        mime_types = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif"}
        mime_type = mime_types.get(ext, "application/octet-stream")

        return Response(content=image_data, media_type=mime_type)
    except ConversionNotFoundException as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})
