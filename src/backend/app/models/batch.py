"""
Batchモデル
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.infrastructure.database import Base


def generate_uuid():
    """UUIDを生成"""
    return str(uuid.uuid4())


class Batch(Base):
    """バッチテーブル"""
    __tablename__ = "batches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("templates.id", ondelete="RESTRICT"), nullable=False, index=True)
    converter_type = Column(String(50), nullable=False)
    status = Column(String(20), default="pending", nullable=False, index=True)
    total_files = Column(Integer, default=0, nullable=False)
    completed_files = Column(Integer, default=0, nullable=False)
    failed_files = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="batches")
    template = relationship("Template", back_populates="batches")
    conversions = relationship("Conversion", back_populates="batch", cascade="all, delete-orphan")

    # インデックス
    __table_args__ = (
        Index('idx_batches_created_at_desc', created_at.desc()),
    )

    # ステータス定数
    STATUS_PENDING = "pending"
    STATUS_PROCESSING = "processing"
    STATUS_COMPLETED = "completed"
    STATUS_PARTIAL = "partial"
    STATUS_CANCELLED = "cancelled"

    @property
    def progress_percent(self) -> int:
        """進捗率を計算"""
        if self.total_files == 0:
            return 0
        return int((self.completed_files + self.failed_files) / self.total_files * 100)

    @property
    def is_finished(self) -> bool:
        """処理が完了したかどうか"""
        return self.status in [self.STATUS_COMPLETED, self.STATUS_PARTIAL, self.STATUS_CANCELLED]

    def update_status(self):
        """子Conversionのステータスからバッチステータスを更新"""
        if self.total_files == 0:
            return

        processed = self.completed_files + self.failed_files
        if processed >= self.total_files:
            if self.failed_files == 0:
                self.status = self.STATUS_COMPLETED
            elif self.completed_files == 0:
                self.status = self.STATUS_CANCELLED
            else:
                self.status = self.STATUS_PARTIAL

    def __repr__(self):
        return f"<Batch(id={self.id}, status={self.status}, {self.completed_files}/{self.total_files})>"
