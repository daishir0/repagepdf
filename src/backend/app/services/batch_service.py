"""
バッチサービス
一括変換のCRUD操作とビジネスロジック
"""
from typing import List, Optional, Tuple
from datetime import datetime
import zipfile
import io
from sqlalchemy.orm import Session

from app.models import Batch, Conversion, Template
from app.core.exceptions import (
    BatchNotFoundException,
    BatchNoCompletedFilesException,
    BatchCannotCancelException,
    TemplateNotFoundException,
    TemplateNotReadyException,
    FileTooLargeException,
    InvalidFileTypeException
)
from app.infrastructure.file_storage import file_storage
from app.core.config import settings


class BatchService:
    """バッチサービスクラス"""

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: int,
        template_id: int,
        converter_type: str,
        files: List[Tuple[str, bytes]]  # (filename, content) のリスト
    ) -> Batch:
        """バッチを作成（ファイルアップロード）"""
        # テンプレートの存在確認と学習状態チェック
        template = self.db.query(Template).filter(
            Template.id == template_id,
            Template.user_id == user_id
        ).first()

        if not template:
            raise TemplateNotFoundException(template_id)

        if not template.is_ready:
            raise TemplateNotReadyException()

        # バッチレコード作成
        batch = Batch(
            user_id=user_id,
            template_id=template_id,
            converter_type=converter_type,
            status=Batch.STATUS_PENDING,
            total_files=len(files)
        )
        self.db.add(batch)
        self.db.commit()
        self.db.refresh(batch)

        # 各ファイルのConversionレコード作成
        for filename, content in files:
            # ファイルサイズチェック
            if len(content) > settings.MAX_UPLOAD_SIZE:
                raise FileTooLargeException()

            # PDFファイルかチェック
            if not filename.lower().endswith('.pdf'):
                raise InvalidFileTypeException()

            # 変換レコード作成
            conversion = Conversion(
                user_id=user_id,
                template_id=template_id,
                batch_id=batch.id,
                original_filename=filename,
                pdf_path="",  # 後で更新
                status=Conversion.STATUS_UPLOADING,
                requested_converter=converter_type
            )
            self.db.add(conversion)
            self.db.commit()
            self.db.refresh(conversion)

            # ファイル保存
            pdf_path = file_storage.save_pdf(conversion.id, filename, content)
            conversion.pdf_path = pdf_path
            conversion.status = Conversion.STATUS_UPLOADED
            self.db.commit()

        return batch

    def get_by_id(self, batch_id: str, user_id: int) -> Batch:
        """IDでバッチを取得"""
        batch = self.db.query(Batch).filter(
            Batch.id == batch_id,
            Batch.user_id == user_id
        ).first()

        if not batch:
            raise BatchNotFoundException(batch_id)

        return batch

    def get_list(
        self,
        user_id: int,
        page: int = 1,
        limit: int = 20
    ) -> Tuple[List[Batch], int]:
        """バッチ一覧を取得"""
        query = self.db.query(Batch).filter(Batch.user_id == user_id)

        total = query.count()

        batches = query.order_by(Batch.created_at.desc()) \
            .offset((page - 1) * limit) \
            .limit(limit) \
            .all()

        return batches, total

    def get_conversions(self, batch_id: str, user_id: int) -> List[Conversion]:
        """バッチ内のConversion一覧を取得"""
        batch = self.get_by_id(batch_id, user_id)
        return self.db.query(Conversion).filter(
            Conversion.batch_id == batch_id
        ).order_by(Conversion.id).all()

    def start_processing(self, batch_id: str, user_id: int) -> Batch:
        """バッチの処理を開始（ステータス更新）"""
        batch = self.get_by_id(batch_id, user_id)
        batch.status = Batch.STATUS_PROCESSING
        self.db.commit()
        self.db.refresh(batch)
        return batch

    def increment_completed(self, batch_id: str) -> Batch:
        """完了ファイル数をインクリメント"""
        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        if batch:
            batch.completed_files += 1
            batch.update_status()
            self.db.commit()
            self.db.refresh(batch)
        return batch

    def increment_failed(self, batch_id: str) -> Batch:
        """失敗ファイル数をインクリメント"""
        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        if batch:
            batch.failed_files += 1
            batch.update_status()
            self.db.commit()
            self.db.refresh(batch)
        return batch

    def cancel(self, batch_id: str, user_id: int) -> Batch:
        """バッチをキャンセル"""
        batch = self.get_by_id(batch_id, user_id)

        # 既に完了している場合はキャンセル不可
        if batch.is_finished:
            raise BatchCannotCancelException()

        # バッチステータスを更新
        batch.status = Batch.STATUS_CANCELLED
        self.db.commit()

        # 未処理のConversionをキャンセル済みに
        pending_conversions = self.db.query(Conversion).filter(
            Conversion.batch_id == batch_id,
            Conversion.status.in_([
                Conversion.STATUS_UPLOADING,
                Conversion.STATUS_UPLOADED
            ])
        ).all()

        for conversion in pending_conversions:
            conversion.status = "cancelled"
            conversion.error_message = "バッチがキャンセルされました"

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def download(self, batch_id: str, user_id: int) -> Tuple[bytes, str]:
        """バッチ内の完了ファイルをZIPでダウンロード"""
        batch = self.get_by_id(batch_id, user_id)

        # 完了したConversionを取得
        completed_conversions = self.db.query(Conversion).filter(
            Conversion.batch_id == batch_id,
            Conversion.status.in_([
                Conversion.STATUS_CONVERTED,
                Conversion.STATUS_APPROVED
            ])
        ).all()

        if not completed_conversions:
            raise BatchNoCompletedFilesException()

        # ZIPファイル作成
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for conversion in completed_conversions:
                if conversion.generated_html:
                    # ファイル名からHTMLファイル名を生成
                    html_filename = conversion.original_filename.rsplit('.', 1)[0] + '.html'
                    zip_file.writestr(html_filename, conversion.generated_html.encode('utf-8'))

        zip_buffer.seek(0)
        zip_filename = f"batch_{batch_id[:8]}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.zip"

        return zip_buffer.read(), zip_filename

    def delete(self, batch_id: str, user_id: int) -> bool:
        """バッチと関連データを削除"""
        batch = self.get_by_id(batch_id, user_id)

        # 関連するConversionのファイルを削除
        conversions = self.db.query(Conversion).filter(
            Conversion.batch_id == batch_id
        ).all()

        for conversion in conversions:
            file_storage.delete_conversion_files(conversion.id)

        # バッチを削除（カスケードでConversionも削除される）
        self.db.delete(batch)
        self.db.commit()
        return True

    def update_batch_status(self, batch_id: str):
        """バッチステータスを子Conversionから算出して更新"""
        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            return

        # 各ステータスのカウント
        conversions = self.db.query(Conversion).filter(
            Conversion.batch_id == batch_id
        ).all()

        completed = sum(1 for c in conversions if c.status in [
            Conversion.STATUS_CONVERTED, Conversion.STATUS_APPROVED
        ])
        failed = sum(1 for c in conversions if c.status in [
            Conversion.STATUS_ERROR, "cancelled"
        ])

        batch.completed_files = completed
        batch.failed_files = failed
        batch.update_status()
        self.db.commit()
