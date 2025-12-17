"""
Templateスキーマ（Pydantic）
"""
from pydantic import BaseModel, HttpUrl, field_validator
from typing import Optional, Any
from datetime import datetime


class TemplateBase(BaseModel):
    """テンプレート基底スキーマ"""
    name: str
    url1: str
    url2: Optional[str] = None
    url3: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        if len(v) > 200:
            raise ValueError('テンプレート名は200文字以内で入力してください')
        return v

    @field_validator('url1', 'url2', 'url3')
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == '':
            return None
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URLはhttp://またはhttps://で始まる必要があります')
        if len(v) > 2000:
            raise ValueError('URLは2000文字以内で入力してください')
        return v


class TemplateCreate(TemplateBase):
    """テンプレート作成スキーマ"""
    pass


class TemplateUpdate(BaseModel):
    """テンプレート更新スキーマ"""
    name: Optional[str] = None
    url1: Optional[str] = None
    url2: Optional[str] = None
    url3: Optional[str] = None


class TemplateResponse(BaseModel):
    """テンプレートレスポンススキーマ"""
    id: int
    name: str
    url1: str
    url2: Optional[str] = None
    url3: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TemplateDetailResponse(TemplateResponse):
    """テンプレート詳細レスポンススキーマ"""
    learned_rules: Optional[Any] = None

    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    """テンプレート一覧レスポンススキーマ"""
    items: list[TemplateResponse]
    total: int
    page: int
    limit: int
    has_next: bool


class LearnResponse(BaseModel):
    """学習開始レスポンススキーマ"""
    id: int
    status: str
    message: str
