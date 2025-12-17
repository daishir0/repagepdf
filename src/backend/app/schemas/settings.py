"""
Settingsスキーマ（Pydantic）
"""
from pydantic import BaseModel
from typing import Optional, List


class ConverterInfo(BaseModel):
    """コンバーター情報スキーマ"""
    id: str
    name: str
    description: str


class ConvertersResponse(BaseModel):
    """コンバーター一覧レスポンススキーマ"""
    available: List[ConverterInfo]
    current: str


class ConverterUpdateRequest(BaseModel):
    """コンバーター設定更新リクエストスキーマ"""
    current_converter: str


class ApiKeyUpdateRequest(BaseModel):
    """APIキー更新リクエストスキーマ"""
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None


class ApiKeyStatusResponse(BaseModel):
    """APIキー設定状況レスポンススキーマ"""
    openai_api_key_set: bool
    anthropic_api_key_set: bool


class ModelInfo(BaseModel):
    """モデル情報スキーマ"""
    id: str
    name: str
    description: str


class ModelCurrentSettings(BaseModel):
    """現在のモデル設定スキーマ"""
    openai_model: str
    anthropic_model: str


class ModelsResponse(BaseModel):
    """モデル一覧レスポンススキーマ"""
    openai_models: List[ModelInfo]
    anthropic_models: List[ModelInfo]
    current: ModelCurrentSettings


class ModelUpdateRequest(BaseModel):
    """モデル設定更新リクエストスキーマ"""
    openai_model: Optional[str] = None
    anthropic_model: Optional[str] = None


class UserSettingsResponse(BaseModel):
    """ユーザー設定統合レスポンススキーマ"""
    id: int
    default_converter: str
    openai_api_key_set: bool
    anthropic_api_key_set: bool
    openai_model: str
    anthropic_model: str
    auto_extract_images: bool = True
    image_quality: int = 85


class UserSettingsUpdateRequest(BaseModel):
    """ユーザー設定統合更新リクエストスキーマ"""
    default_converter: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    openai_model: Optional[str] = None
    anthropic_model: Optional[str] = None
    auto_extract_images: Optional[bool] = None
    image_quality: Optional[int] = None
