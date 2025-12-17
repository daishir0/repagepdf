"""
セキュリティ関連ユーティリティ
JWT認証、パスワードハッシュ、APIキー暗号化
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from cryptography.fernet import Fernet, InvalidToken
import base64
import os

from app.core.config import settings


class SecurityService:
    """セキュリティサービスクラス"""

    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self._fernet: Optional[Fernet] = None

    @property
    def fernet(self) -> Optional[Fernet]:
        """Fernetインスタンスを取得（遅延初期化）"""
        if self._fernet is None and settings.ENCRYPTION_KEY:
            try:
                self._fernet = Fernet(settings.ENCRYPTION_KEY.encode())
            except Exception:
                pass
        return self._fernet

    def hash_password(self, password: str) -> str:
        """パスワードをbcryptでハッシュ化"""
        return self.pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """パスワードを検証"""
        return self.pwd_context.verify(plain_password, hashed_password)

    def create_access_token(self, user_id: int, expires_delta: Optional[timedelta] = None) -> str:
        """JWTアクセストークンを生成"""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)

        payload = {
            "sub": str(user_id),
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def decode_token(self, token: str) -> Optional[int]:
        """トークンをデコードしてuser_idを取得"""
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            user_id = payload.get("sub")
            if user_id is None:
                return None
            return int(user_id)
        except JWTError:
            return None

    def encrypt_api_key(self, api_key: str) -> Optional[str]:
        """APIキーをFernetで暗号化"""
        if not self.fernet or not api_key:
            return None
        try:
            encrypted = self.fernet.encrypt(api_key.encode())
            return encrypted.decode()
        except Exception:
            return None

    def decrypt_api_key(self, encrypted_key: str) -> Optional[str]:
        """APIキーを復号化"""
        if not self.fernet or not encrypted_key:
            return None
        try:
            decrypted = self.fernet.decrypt(encrypted_key.encode())
            return decrypted.decode()
        except InvalidToken:
            return None

    @staticmethod
    def generate_encryption_key() -> str:
        """新しいFernet暗号化キーを生成"""
        return Fernet.generate_key().decode()


# シングルトンインスタンス
security_service = SecurityService()
