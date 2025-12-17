"""
Conversionモデル
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.infrastructure.database import Base


class Conversion(Base):
    """変換テーブル"""
    __tablename__ = "conversions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("templates.id", ondelete="RESTRICT"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    pdf_path = Column(String(500), nullable=False)
    generated_html = Column(Text)
    status = Column(String(20), default="uploading", nullable=False, index=True)
    converter_used = Column(String(50))
    requested_converter = Column(String(50))  # フロントエンドから指定されたコンバーター
    page_count = Column(Integer)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    approved_at = Column(DateTime)

    # Relationships
    user = relationship("User", back_populates="conversions")
    template = relationship("Template", back_populates="conversions")
    images = relationship("ExtractedImage", back_populates="conversion", cascade="all, delete-orphan")

    # ステータス定数
    STATUS_UPLOADING = "uploading"
    STATUS_UPLOADED = "uploaded"
    STATUS_CONVERTING = "converting"
    STATUS_CONVERTED = "completed"
    STATUS_APPROVED = "approved"
    STATUS_ERROR = "error"

    @property
    def is_converted(self) -> bool:
        """変換完了済みかどうか"""
        return self.status in [self.STATUS_CONVERTED, self.STATUS_APPROVED]

    def __repr__(self):
        return f"<Conversion(id={self.id}, filename={self.original_filename}, status={self.status})>"


class ExtractedImage(Base):
    """抽出画像テーブル"""
    __tablename__ = "extracted_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversion_id = Column(Integer, ForeignKey("conversions.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    page_number = Column(Integer, nullable=False)
    order_in_page = Column(Integer, default=0, nullable=False)
    width = Column(Integer)
    height = Column(Integer)
    file_size = Column(Integer)
    mime_type = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    conversion = relationship("Conversion", back_populates="images")

    def __repr__(self):
        return f"<ExtractedImage(id={self.id}, filename={self.filename})>"
