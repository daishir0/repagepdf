"""
認証サービス
ログイン、ユーザー管理
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.models import User, UserSettings
from app.schemas import UserCreate, UserResponse, TokenResponse
from app.core.security import security_service
from app.core.config import settings
from app.core.exceptions import InvalidCredentialsException, NotFoundException


class AuthService:
    """認証サービスクラス"""

    def __init__(self, db: Session):
        self.db = db

    def authenticate(self, email: str, password: str) -> TokenResponse:
        """ユーザー認証を行いトークンを発行"""
        user = self.db.query(User).filter(User.email == email).first()

        if not user:
            raise InvalidCredentialsException()

        if not security_service.verify_password(password, user.password_hash):
            raise InvalidCredentialsException()

        # トークン生成
        access_token = security_service.create_access_token(user.id)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.JWT_EXPIRE_MINUTES * 60,
            user=UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                created_at=user.created_at
            )
        )

    def get_user_by_id(self, user_id: int) -> User:
        """IDでユーザーを取得"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundException(f"ユーザーID {user_id} が見つかりません")
        return user

    def get_current_user(self, token: str) -> User:
        """トークンから現在のユーザーを取得"""
        user_id = security_service.decode_token(token)
        if user_id is None:
            raise InvalidCredentialsException()
        return self.get_user_by_id(user_id)

    def create_user(self, data: UserCreate) -> User:
        """新規ユーザーを作成"""
        # パスワードをハッシュ化
        password_hash = security_service.hash_password(data.password)

        user = User(
            email=data.email,
            password_hash=password_hash,
            name=data.name
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        # デフォルト設定を作成
        user_settings = UserSettings(user_id=user.id)
        self.db.add(user_settings)
        self.db.commit()

        return user

    def user_exists(self, email: str) -> bool:
        """メールアドレスでユーザーの存在確認"""
        return self.db.query(User).filter(User.email == email).first() is not None
