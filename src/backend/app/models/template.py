"""
Templateモデル
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.infrastructure.database import Base


class Template(Base):
    """テンプレートテーブル"""
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    url1 = Column(String(2000), nullable=False)
    url2 = Column(String(2000))
    url3 = Column(String(2000))
    learned_rules = Column(Text)  # JSON形式で保存
    status = Column(String(20), default="pending", nullable=False, index=True)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="templates")
    conversions = relationship("Conversion", back_populates="template")

    # ステータス定数
    STATUS_PENDING = "pending"
    STATUS_LEARNING = "learning"
    STATUS_READY = "ready"
    STATUS_ERROR = "error"

    @property
    def is_ready(self) -> bool:
        """学習完了済みかどうか"""
        return self.status == self.STATUS_READY

    @property
    def urls(self) -> list:
        """有効なURL一覧を取得"""
        return [url for url in [self.url1, self.url2, self.url3] if url]

    def __repr__(self):
        return f"<Template(id={self.id}, name={self.name}, status={self.status})>"
