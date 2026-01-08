"""
バッチAPI
一括PDF変換のCRUD、ダウンロード
"""
import logging
import threading
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user
from app.models import User, Conversion
from app.schemas import ApiResponse
from app.schemas.batch import (
    BatchResponse, BatchDetailResponse, BatchListResponse
)
from app.schemas.conversion import ConversionResponse
from app.services import BatchService, ConversionService, SettingsService
from app.infrastructure.database import SessionLocal
from app.core.exceptions import (
    BatchNotFoundException, BatchNoCompletedFilesException,
    BatchCannotCancelException
)

router = APIRouter(prefix="/batches", tags=["バッチ"])
logger = logging.getLogger(__name__)


@router.get("", response_model=ApiResponse[BatchListResponse])
def get_batches(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """バッチ一覧取得"""
    batch_service = BatchService(db)
    batches, total = batch_service.get_list(
        user_id=current_user.id,
        page=page,
        limit=limit
    )

    return ApiResponse.ok(
        data=BatchListResponse(
            items=[BatchResponse.model_validate(b) for b in batches],
            total=total
        )
    )


@router.post("", response_model=ApiResponse[BatchResponse])
async def create_batch(
    files: List[UploadFile] = File(...),
    template_id: int = Form(...),
    converter_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """バッチ作成（複数PDFアップロード）"""
    # ファイル内容を読み込み
    file_data = []
    for file in files:
        content = await file.read()
        file_data.append((file.filename, content))

    batch_service = BatchService(db)
    batch = batch_service.create(
        user_id=current_user.id,
        template_id=template_id,
        converter_type=converter_type,
        files=file_data
    )

    return ApiResponse.ok(
        data=BatchResponse.model_validate(batch),
        message=f"{len(files)}件のファイルをアップロードしました"
    )


@router.get("/{batch_id}", response_model=ApiResponse[BatchDetailResponse])
def get_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """バッチ詳細取得"""
    batch_service = BatchService(db)
    batch = batch_service.get_by_id(batch_id, current_user.id)
    conversions = batch_service.get_conversions(batch_id, current_user.id)

    response_data = BatchDetailResponse(
        id=batch.id,
        template_id=batch.template_id,
        converter_type=batch.converter_type,
        status=batch.status,
        total_files=batch.total_files,
        completed_files=batch.completed_files,
        failed_files=batch.failed_files,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
        conversions=[ConversionResponse.model_validate(c) for c in conversions]
    )

    return ApiResponse.ok(data=response_data)


@router.post("/{batch_id}/cancel", response_model=ApiResponse[BatchResponse])
def cancel_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """バッチキャンセル"""
    batch_service = BatchService(db)
    batch = batch_service.cancel(batch_id, current_user.id)

    return ApiResponse.ok(
        data=BatchResponse.model_validate(batch),
        message="バッチをキャンセルしました"
    )


@router.get("/{batch_id}/download")
def download_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """バッチ一括ダウンロード（ZIP）"""
    batch_service = BatchService(db)
    zip_content, filename = batch_service.download(batch_id, current_user.id)

    return Response(
        content=zip_content,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.delete("/{batch_id}", response_model=ApiResponse[None])
def delete_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """バッチ削除"""
    batch_service = BatchService(db)
    batch_service.delete(batch_id, current_user.id)

    return ApiResponse.ok(message="バッチを削除しました")


def _process_batch_in_background(batch_id: str, user_id: int):
    """バッチ内の全変換をバックグラウンドで処理"""
    import asyncio
    from app.services import HtmlGeneratorService
    from app.services.template_service import TemplateService
    from app.core.security import security_service
    from app.converters import ConverterManager
    from app.infrastructure.file_storage import file_storage

    db = SessionLocal()
    try:
        batch_service = BatchService(db)
        conversion_service = ConversionService(db)
        settings_service = SettingsService(db)

        # バッチ内の変換を取得
        conversions = batch_service.get_conversions(batch_id, user_id)
        user_settings = settings_service.get_or_create(user_id)

        for conversion in conversions:
            if conversion.status != Conversion.STATUS_UPLOADED:
                continue

            try:
                # ステータスを変換中に更新 (0%)
                conversion_service.set_converting_status(conversion)

                # 進捗: 5% - 初期化完了
                conversion_service.update_progress(conversion, 5)

                # APIキー復号
                openai_key = ""
                anthropic_key = ""
                if user_settings.openai_api_key_enc:
                    openai_key = security_service.decrypt_api_key(user_settings.openai_api_key_enc) or ""
                if user_settings.anthropic_api_key_enc:
                    anthropic_key = security_service.decrypt_api_key(user_settings.anthropic_api_key_enc) or ""

                # コンバーター設定
                converter_type = conversion.requested_converter or user_settings.current_converter
                converter_manager = ConverterManager(
                    openai_api_key=openai_key,
                    anthropic_api_key=anthropic_key,
                    openai_model=user_settings.openai_model,
                    anthropic_model=user_settings.anthropic_model,
                    default_converter=converter_type
                )

                # 進捗: 10% - コンバーター準備完了
                conversion_service.update_progress(conversion, 10)

                # PDF変換（テキスト抽出）
                pdf_path = file_storage.get_file_path(conversion.pdf_path)
                result = converter_manager.convert(str(pdf_path))

                # 進捗: 50% - PDF変換完了
                conversion_service.update_progress(conversion, 50)

                # 画像保存
                image_urls = []
                total_images = len(result.images)
                for idx, img in enumerate(result.images):
                    ext = img.mime_type.split("/")[-1]
                    filename = f"page{img.page_number}_{img.order_in_page}.{ext}"
                    img_path = file_storage.save_image(conversion.id, filename, img.data)
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
                    # 進捗: 50-70% - 画像処理
                    if total_images > 0:
                        image_progress = 50 + int(20 * (idx + 1) / total_images)
                        conversion_service.update_progress(conversion, image_progress)

                # 進捗: 70% - 画像処理完了
                conversion_service.update_progress(conversion, 70)

                # テンプレート取得
                template_service = TemplateService(db)
                template = template_service.get_by_id(conversion.template_id, conversion.user_id)

                # LLMでスタイル付きHTML生成
                html_generator = HtmlGeneratorService(db)
                try:
                    # 進捗: 75% - HTML生成開始
                    conversion_service.update_progress(conversion, 75)

                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        html = loop.run_until_complete(
                            html_generator.generate_styled_html(result.text, template, user_settings)
                        )
                    finally:
                        loop.close()
                except Exception as e:
                    logger.warning(f"LLM HTML generation failed, using basic conversion: {e}")
                    html = html_generator._basic_html_wrap(result.text)

                # 進捗: 95% - HTML生成完了
                conversion_service.update_progress(conversion, 95)

                # 画像タグ挿入
                if image_urls:
                    html = _insert_images_to_html(html, image_urls, conversion.id)

                conversion_service.set_converted_status(
                    conversion,
                    html=html,
                    converter_used=converter_type,
                    page_count=result.page_count
                )

                # バッチの完了カウント更新
                batch_service.increment_completed(batch_id)

            except Exception as e:
                logger.error(f"Batch conversion failed for {conversion.id}: {e}")
                conversion_service.set_error_status(conversion, str(e))
                batch_service.increment_failed(batch_id)

    except Exception as e:
        logger.error(f"Batch processing failed: {e}")
    finally:
        db.close()


def _insert_images_to_html(html: str, image_urls: list, conversion_id: int) -> str:
    """HTMLに画像タグを挿入"""
    if not image_urls:
        return html

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

    if '</article>' in html:
        html = html.replace('</article>', f'{images_html}</article>')
    elif '</body>' in html:
        html = html.replace('</body>', f'{images_html}</body>')
    else:
        html += images_html

    return html


@router.post("/{batch_id}/start", response_model=ApiResponse[BatchResponse])
def start_batch_processing(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """バッチ処理開始"""
    batch_service = BatchService(db)
    batch = batch_service.start_processing(batch_id, current_user.id)

    # バックグラウンドスレッドで変換処理を開始
    thread = threading.Thread(
        target=_process_batch_in_background,
        args=(batch_id, current_user.id),
        daemon=True
    )
    thread.start()

    return ApiResponse.ok(
        data=BatchResponse.model_validate(batch),
        message="バッチ処理を開始しました"
    )
