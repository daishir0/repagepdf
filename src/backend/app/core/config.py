"""
アプリケーション設定
環境変数から設定値を読み込む
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """アプリケーション設定クラス"""

    # Application
    APP_NAME: str = "RePage PDF"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8018

    # Database
    DATABASE_URL: str = "sqlite:///./data/repage.db"

    # Storage
    STORAGE_PATH: str = "./storage"
    MAX_UPLOAD_SIZE: int = 52428800  # 50MB

    # JWT
    JWT_SECRET_KEY: str = "change-this-secret-key-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24時間

    # Converters
    DEFAULT_CONVERTER: str = "pymupdf"

    # LLM Models
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_MODEL: str = "claude-3-haiku-20240307"

    # API Keys (環境変数から取得)
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Encryption
    ENCRYPTION_KEY: str = ""  # Fernet互換の32バイトBase64キー

    # CORS
    CORS_ORIGINS: list = ["http://localhost:3013"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# シングルトンインスタンス
settings = Settings()
