"""
WordPressPublicationモデル
WordPress公開履歴を管理
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime

from app.infrastructure.database import Base


class WordPressPublication(Base):
    """WordPress公開履歴テーブル"""
    __tablename__ = "wordpress_publications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    conversion_id = Column(Integer, ForeignKey("conversions.id", ondelete="SET NULL"), nullable=True)

    # WordPress情報
    wp_site_url = Column(String(500), nullable=False)
    wp_post_id = Column(Integer)
    wp_post_url = Column(String(500))
    wp_admin_url = Column(String(500))

    # 投稿情報
    title = Column(String(500), nullable=False)
    status = Column(String(20), nullable=False)  # draft, publish
    categories = Column(Text)  # JSON array of category names
    tags = Column(Text)  # JSON array of tag names

    # 結果情報
    publish_status = Column(String(20), nullable=False)  # success, failed
    error_message = Column(Text)

    # タイムスタンプ
    published_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="wordpress_publications")
    conversion = relationship("Conversion", back_populates="wordpress_publications")

    # ステータス定数
    STATUS_DRAFT = "draft"
    STATUS_PUBLISH = "publish"
    VALID_STATUSES = [STATUS_DRAFT, STATUS_PUBLISH]

    PUBLISH_STATUS_SUCCESS = "success"
    PUBLISH_STATUS_FAILED = "failed"

    # インデックス
    __table_args__ = (
        Index("idx_wp_pub_user_date", "user_id", "published_at"),
        Index("idx_wp_pub_user_site", "user_id", "wp_site_url"),
    )

    def __repr__(self):
        return f"<WordPressPublication(id={self.id}, title={self.title}, status={self.publish_status})>"
