"""
WordPress関連のPydanticスキーマ
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


# ========== 接続テスト ==========

class WPConnectionTestResponse(BaseModel):
    """WordPress接続テストレスポンス"""
    valid: bool
    site_name: Optional[str] = None
    user_name: Optional[str] = None
    error_message: Optional[str] = None


# ========== カテゴリ・タグ ==========

class WPCategory(BaseModel):
    """WordPressカテゴリ"""
    id: int
    name: str
    slug: str
    count: int


class WPTag(BaseModel):
    """WordPressタグ"""
    id: int
    name: str
    slug: str
    count: int


class WPCategoriesResponse(BaseModel):
    """カテゴリ一覧レスポンス"""
    categories: List[WPCategory]


class WPTagsResponse(BaseModel):
    """タグ一覧レスポンス"""
    tags: List[WPTag]


# ========== 公開 ==========

class WPPublishRequest(BaseModel):
    """WordPress公開リクエスト"""
    conversion_id: int
    title: str
    status: str = Field(default="draft", pattern="^(draft|publish)$")
    category_ids: List[int] = []
    tag_ids: List[int] = []
    new_tags: List[str] = []


class WPPublishResponse(BaseModel):
    """WordPress公開レスポンス"""
    success: bool
    post_id: Optional[int] = None
    post_url: Optional[str] = None
    admin_url: Optional[str] = None
    error_message: Optional[str] = None


# ========== 公開履歴 ==========

class WPHistoryItem(BaseModel):
    """公開履歴アイテム"""
    id: int
    conversion_id: Optional[int] = None
    wp_site_url: str
    wp_post_id: Optional[int] = None
    wp_post_url: Optional[str] = None
    wp_admin_url: Optional[str] = None
    title: str
    status: str
    categories: List[str] = []
    tags: List[str] = []
    publish_status: str
    error_message: Optional[str] = None
    published_at: datetime

    class Config:
        from_attributes = True


class WPHistoryResponse(BaseModel):
    """公開履歴一覧レスポンス"""
    items: List[WPHistoryItem]
    total: int
    page: int
    limit: int


class WPHistoryFilterParams(BaseModel):
    """履歴フィルターパラメータ"""
    site: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = 1
    limit: int = 20
