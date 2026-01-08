"""
UserSettingsモデル
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.infrastructure.database import Base


class UserSettings(Base):
    """ユーザー設定テーブル"""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    current_converter = Column(String(50), default="pymupdf", nullable=False)
    openai_model = Column(String(50), default="gpt-4o-mini", nullable=False)
    anthropic_model = Column(String(50), default="claude-3-haiku-20240307", nullable=False)
    openai_api_key_enc = Column(Text)  # 暗号化されたAPIキー
    anthropic_api_key_enc = Column(Text)  # 暗号化されたAPIキー
    # WordPress連携設定（暗号化）
    wp_url_enc = Column(Text)  # 暗号化されたWordPress URL
    wp_username_enc = Column(Text)  # 暗号化されたユーザー名
    wp_app_password_enc = Column(Text)  # 暗号化されたアプリケーションパスワード
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="settings")

    # コンバーター定数
    CONVERTER_PYMUPDF = "pymupdf"
    CONVERTER_PDFPLUMBER = "pdfplumber"
    CONVERTER_OPENAI = "openai"
    CONVERTER_CLAUDE = "claude"

    VALID_CONVERTERS = [CONVERTER_PYMUPDF, CONVERTER_PDFPLUMBER, CONVERTER_OPENAI, CONVERTER_CLAUDE]

    # モデル定数
    OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o"]
    ANTHROPIC_MODELS = ["claude-3-haiku-20240307", "claude-3-5-sonnet-20241022"]

    @property
    def has_openai_key(self) -> bool:
        """OpenAI APIキーが設定されているか"""
        return bool(self.openai_api_key_enc)

    @property
    def has_anthropic_key(self) -> bool:
        """Anthropic APIキーが設定されているか"""
        return bool(self.anthropic_api_key_enc)

    @property
    def has_wordpress_config(self) -> bool:
        """WordPress連携が設定されているか"""
        return bool(self.wp_url_enc and self.wp_username_enc and self.wp_app_password_enc)

    def __repr__(self):
        return f"<UserSettings(user_id={self.user_id}, converter={self.current_converter})>"
