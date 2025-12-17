"""
変換サービス
PDF変換のCRUD操作
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import Conversion, ExtractedImage, Template
from app.core.exceptions import (
    ConversionNotFoundException, TemplateNotReadyException,
    FileTooLargeException, InvalidFileTypeException
)
from app.infrastructure.file_storage import file_storage
from app.core.config import settings


class ConversionService:
    """変換サービスクラス"""

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: int,
        template_id: int,
        filename: str,
        file_content: bytes,
        requested_converter: Optional[str] = None
    ) -> Conversion:
        """変換を作成（PDFアップロード）"""
        # テンプレートの存在確認と学習状態チェック
        template = self.db.query(Template).filter(
            Template.id == template_id,
            Template.user_id == user_id
        ).first()

        if not template:
            from app.core.exceptions import TemplateNotFoundException
            raise TemplateNotFoundException(template_id)

        if not template.is_ready:
            raise TemplateNotReadyException()

        # ファイルサイズチェック
        if len(file_content) > settings.MAX_UPLOAD_SIZE:
            raise FileTooLargeException()

        # PDFファイルかチェック
        if not filename.lower().endswith('.pdf'):
            raise InvalidFileTypeException()

        # 変換レコード作成
        conversion = Conversion(
            user_id=user_id,
            template_id=template_id,
            original_filename=filename,
            pdf_path="",  # 後で更新
            status=Conversion.STATUS_UPLOADING,
            requested_converter=requested_converter
        )
        self.db.add(conversion)
        self.db.commit()
        self.db.refresh(conversion)

        # ファイル保存
        pdf_path = file_storage.save_pdf(conversion.id, filename, file_content)
        conversion.pdf_path = pdf_path
        conversion.status = Conversion.STATUS_UPLOADED
        self.db.commit()

        return conversion

    def get_by_id(self, conversion_id: int, user_id: int) -> Conversion:
        """IDで変換を取得"""
        conversion = self.db.query(Conversion).filter(
            Conversion.id == conversion_id,
            Conversion.user_id == user_id
        ).first()

        if not conversion:
            raise ConversionNotFoundException(conversion_id)

        return conversion

    def get_list(
        self,
        user_id: int,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> tuple[List[Conversion], int]:
        """変換一覧を取得"""
        query = self.db.query(Conversion).filter(Conversion.user_id == user_id)

        if status:
            query = query.filter(Conversion.status == status)

        total = query.count()

        conversions = query.order_by(Conversion.created_at.desc()) \
            .offset((page - 1) * limit) \
            .limit(limit) \
            .all()

        return conversions, total

    def get_recent(self, user_id: int, limit: int = 5) -> List[Conversion]:
        """最近の変換を取得"""
        return self.db.query(Conversion).filter(
            Conversion.user_id == user_id
        ).order_by(Conversion.created_at.desc()).limit(limit).all()

    def update_html(self, conversion_id: int, user_id: int, html: str) -> Conversion:
        """生成HTMLを更新"""
        conversion = self.get_by_id(conversion_id, user_id)
        conversion.generated_html = html
        self.db.commit()
        self.db.refresh(conversion)
        return conversion

    def approve(self, conversion_id: int, user_id: int) -> Conversion:
        """変換を承認"""
        conversion = self.get_by_id(conversion_id, user_id)
        conversion.status = Conversion.STATUS_APPROVED
        conversion.approved_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(conversion)
        return conversion

    def set_converting_status(self, conversion: Conversion):
        """変換中ステータスに更新"""
        conversion.status = Conversion.STATUS_CONVERTING
        self.db.commit()

    def set_converted_status(
        self,
        conversion: Conversion,
        html: str,
        converter_used: str,
        page_count: int
    ):
        """変換完了ステータスに更新"""
        conversion.status = Conversion.STATUS_CONVERTED
        conversion.generated_html = html
        conversion.converter_used = converter_used
        conversion.page_count = page_count
        self.db.commit()

    def set_error_status(self, conversion: Conversion, error_message: str):
        """エラーステータスに更新"""
        conversion.status = Conversion.STATUS_ERROR
        conversion.error_message = error_message
        self.db.commit()

    def add_image(
        self,
        conversion_id: int,
        filename: str,
        file_path: str,
        page_number: int,
        order_in_page: int,
        width: int,
        height: int,
        file_size: int,
        mime_type: str
    ) -> ExtractedImage:
        """抽出画像を追加"""
        image = ExtractedImage(
            conversion_id=conversion_id,
            filename=filename,
            file_path=file_path,
            page_number=page_number,
            order_in_page=order_in_page,
            width=width,
            height=height,
            file_size=file_size,
            mime_type=mime_type
        )
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        return image

    def delete(self, conversion_id: int, user_id: int) -> bool:
        """変換を削除"""
        conversion = self.get_by_id(conversion_id, user_id)

        # ファイル削除
        file_storage.delete_conversion_files(conversion_id)

        # DB削除
        self.db.delete(conversion)
        self.db.commit()
        return True
