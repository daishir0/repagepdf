"""
Conversionスキーマ（Pydantic）
"""
from pydantic import BaseModel, computed_field
from typing import Optional, List
from datetime import datetime


class ImageResponse(BaseModel):
    """画像レスポンススキーマ"""
    id: int
    filename: str
    page_number: int
    order_in_page: int
    width: Optional[int] = None
    height: Optional[int] = None

    class Config:
        from_attributes = True


class TemplateSimple(BaseModel):
    """テンプレート簡易スキーマ"""
    id: int
    name: str

    class Config:
        from_attributes = True


class ConversionBase(BaseModel):
    """変換基底スキーマ"""
    template_id: int


class ConversionCreate(ConversionBase):
    """変換作成スキーマ"""
    pass


class ConversionResponse(BaseModel):
    """変換レスポンススキーマ"""
    id: int
    template_id: int
    original_filename: str
    status: str
    page_count: Optional[int] = None
    converter_used: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def converter_type(self) -> Optional[str]:
        """フロントエンド互換のconverter_typeプロパティ"""
        return self.converter_used

    class Config:
        from_attributes = True


class ConversionDetailResponse(ConversionResponse):
    """変換詳細レスポンススキーマ"""
    generated_html: Optional[str] = None
    template: TemplateSimple
    images: List[ImageResponse] = []
    error_message: Optional[str] = None
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversionListResponse(BaseModel):
    """変換一覧レスポンススキーマ"""
    items: List[ConversionResponse]
    total: int
    page: int
    limit: int
    has_next: bool


class ConversionUploadResponse(BaseModel):
    """アップロードレスポンススキーマ"""
    id: int
    template_id: int
    original_filename: str
    page_count: Optional[int] = None
    status: str
    created_at: datetime


class ConversionGenerateResponse(BaseModel):
    """生成開始レスポンススキーマ"""
    id: int
    status: str
    message: str


class ConversionUpdateRequest(BaseModel):
    """変換更新リクエストスキーマ"""
    generated_html: str


class ConversionApproveResponse(BaseModel):
    """承認レスポンススキーマ"""
    id: int
    status: str
    approved_at: datetime
