"""
設定サービス
ユーザー設定の管理
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.models import UserSettings
from app.core.security import security_service
from app.core.exceptions import NotFoundException, ValidationException


class SettingsService:
    """設定サービスクラス"""

    def __init__(self, db: Session):
        self.db = db

    def get_or_create(self, user_id: int) -> UserSettings:
        """ユーザー設定を取得（なければ作成）"""
        settings = self.db.query(UserSettings).filter(
            UserSettings.user_id == user_id
        ).first()

        if not settings:
            settings = UserSettings(user_id=user_id)
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)

        return settings

    def update_converter(self, user_id: int, converter: str) -> UserSettings:
        """コンバーター設定を更新"""
        if converter not in UserSettings.VALID_CONVERTERS:
            raise ValidationException(
                f"無効なコンバーター: {converter}",
                details={"valid_converters": UserSettings.VALID_CONVERTERS}
            )

        settings = self.get_or_create(user_id)
        settings.current_converter = converter
        self.db.commit()
        self.db.refresh(settings)
        return settings

    def update_api_keys(
        self,
        user_id: int,
        openai_api_key: Optional[str] = None,
        anthropic_api_key: Optional[str] = None
    ) -> UserSettings:
        """APIキーを更新"""
        settings = self.get_or_create(user_id)

        if openai_api_key is not None:
            if openai_api_key == "":
                settings.openai_api_key_enc = None
            else:
                encrypted = security_service.encrypt_api_key(openai_api_key)
                settings.openai_api_key_enc = encrypted

        if anthropic_api_key is not None:
            if anthropic_api_key == "":
                settings.anthropic_api_key_enc = None
            else:
                encrypted = security_service.encrypt_api_key(anthropic_api_key)
                settings.anthropic_api_key_enc = encrypted

        self.db.commit()
        self.db.refresh(settings)
        return settings

    def update_models(
        self,
        user_id: int,
        openai_model: Optional[str] = None,
        anthropic_model: Optional[str] = None
    ) -> UserSettings:
        """モデル設定を更新"""
        settings = self.get_or_create(user_id)

        if openai_model is not None:
            if openai_model not in UserSettings.OPENAI_MODELS:
                raise ValidationException(
                    f"無効なOpenAIモデル: {openai_model}",
                    details={"valid_models": UserSettings.OPENAI_MODELS}
                )
            settings.openai_model = openai_model

        if anthropic_model is not None:
            if anthropic_model not in UserSettings.ANTHROPIC_MODELS:
                raise ValidationException(
                    f"無効なAnthropicモデル: {anthropic_model}",
                    details={"valid_models": UserSettings.ANTHROPIC_MODELS}
                )
            settings.anthropic_model = anthropic_model

        self.db.commit()
        self.db.refresh(settings)
        return settings

    def get_decrypted_api_keys(self, user_id: int) -> dict:
        """復号化されたAPIキーを取得"""
        settings = self.get_or_create(user_id)

        openai_key = None
        anthropic_key = None

        if settings.openai_api_key_enc:
            openai_key = security_service.decrypt_api_key(settings.openai_api_key_enc)

        if settings.anthropic_api_key_enc:
            anthropic_key = security_service.decrypt_api_key(settings.anthropic_api_key_enc)

        return {
            "openai_api_key": openai_key,
            "anthropic_api_key": anthropic_key
        }

    def update_wordpress_config(
        self,
        user_id: int,
        wp_url: Optional[str] = None,
        wp_username: Optional[str] = None,
        wp_app_password: Optional[str] = None
    ) -> UserSettings:
        """WordPress連携設定を更新"""
        settings = self.get_or_create(user_id)

        if wp_url is not None:
            if wp_url == "":
                settings.wp_url_enc = None
            else:
                # HTTPSを強制
                if not wp_url.startswith("https://"):
                    raise ValidationException(
                        "WordPress URLはHTTPS（https://）で始まる必要があります"
                    )
                encrypted = security_service.encrypt_api_key(wp_url.rstrip("/"))
                settings.wp_url_enc = encrypted

        if wp_username is not None:
            if wp_username == "":
                settings.wp_username_enc = None
            else:
                encrypted = security_service.encrypt_api_key(wp_username)
                settings.wp_username_enc = encrypted

        if wp_app_password is not None:
            if wp_app_password == "":
                settings.wp_app_password_enc = None
            else:
                encrypted = security_service.encrypt_api_key(wp_app_password)
                settings.wp_app_password_enc = encrypted

        self.db.commit()
        self.db.refresh(settings)
        return settings

    def get_wordpress_config_status(self, user_id: int) -> dict:
        """WordPress設定状態を取得"""
        settings = self.get_or_create(user_id)

        return {
            "is_configured": settings.has_wordpress_config,
            "has_url": bool(settings.wp_url_enc),
            "has_username": bool(settings.wp_username_enc),
            "has_password": bool(settings.wp_app_password_enc)
        }
