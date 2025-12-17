"""
Userスキーマ（Pydantic）
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """ユーザー基底スキーマ"""
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    """ユーザー作成スキーマ"""
    password: str


class UserLogin(BaseModel):
    """ログインスキーマ"""
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """ユーザーレスポンススキーマ"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """トークンレスポンススキーマ"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
