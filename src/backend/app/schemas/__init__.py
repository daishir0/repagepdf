"""
Pydanticスキーマ
"""
from app.schemas.common import ApiResponse, ErrorDetail, PaginationParams
from app.schemas.user import (
    UserCreate, UserLogin, UserResponse, TokenResponse
)
from app.schemas.template import (
    TemplateCreate, TemplateUpdate, TemplateResponse,
    TemplateDetailResponse, TemplateListResponse, LearnResponse
)
from app.schemas.conversion import (
    ConversionCreate, ConversionResponse, ConversionDetailResponse,
    ConversionListResponse, ConversionUploadResponse, ConversionGenerateResponse,
    ConversionUpdateRequest, ConversionApproveResponse, ImageResponse
)
from app.schemas.settings import (
    ConvertersResponse, ConverterUpdateRequest, ConverterInfo,
    ApiKeyUpdateRequest, ApiKeyStatusResponse,
    ModelsResponse, ModelUpdateRequest, ModelInfo, ModelCurrentSettings,
    UserSettingsResponse, UserSettingsUpdateRequest
)

__all__ = [
    "ApiResponse", "ErrorDetail", "PaginationParams",
    "UserCreate", "UserLogin", "UserResponse", "TokenResponse",
    "TemplateCreate", "TemplateUpdate", "TemplateResponse",
    "TemplateDetailResponse", "TemplateListResponse", "LearnResponse",
    "ConversionCreate", "ConversionResponse", "ConversionDetailResponse",
    "ConversionListResponse", "ConversionUploadResponse", "ConversionGenerateResponse",
    "ConversionUpdateRequest", "ConversionApproveResponse", "ImageResponse",
    "ConvertersResponse", "ConverterUpdateRequest", "ConverterInfo",
    "ApiKeyUpdateRequest", "ApiKeyStatusResponse",
    "ModelsResponse", "ModelUpdateRequest", "ModelInfo", "ModelCurrentSettings",
    "UserSettingsResponse", "UserSettingsUpdateRequest"
]
