"""
設定API
コンバーター、モデル、APIキー設定
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models import User, UserSettings
from app.schemas import (
    ApiResponse, ConvertersResponse, ConverterUpdateRequest, ConverterInfo,
    ApiKeyUpdateRequest, ApiKeyStatusResponse,
    ModelsResponse, ModelUpdateRequest, ModelInfo,
    UserSettingsResponse, UserSettingsUpdateRequest
)
from app.schemas.settings import ModelCurrentSettings
from app.services import SettingsService
from app.converters import ConverterManager
from app.core.exceptions import ValidationException

router = APIRouter(prefix="/settings", tags=["設定"])


@router.get("", response_model=ApiResponse[UserSettingsResponse])
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """統合ユーザー設定取得"""
    settings_service = SettingsService(db)
    user_settings = settings_service.get_or_create(current_user.id)

    return ApiResponse.ok(
        data=UserSettingsResponse(
            id=user_settings.id,
            default_converter=user_settings.current_converter,
            openai_api_key_set=user_settings.has_openai_key,
            anthropic_api_key_set=user_settings.has_anthropic_key,
            openai_model=user_settings.openai_model,
            anthropic_model=user_settings.anthropic_model,
            auto_extract_images=True,
            image_quality=85
        )
    )


@router.put("", response_model=ApiResponse[UserSettingsResponse])
def update_settings(
    data: UserSettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """統合ユーザー設定更新"""
    try:
        settings_service = SettingsService(db)
        user_settings = settings_service.get_or_create(current_user.id)

        # コンバーター更新
        if data.default_converter:
            user_settings = settings_service.update_converter(current_user.id, data.default_converter)

        # APIキー更新
        if data.openai_api_key is not None or data.anthropic_api_key is not None:
            user_settings = settings_service.update_api_keys(
                user_id=current_user.id,
                openai_api_key=data.openai_api_key,
                anthropic_api_key=data.anthropic_api_key
            )

        # モデル更新
        if data.openai_model is not None or data.anthropic_model is not None:
            user_settings = settings_service.update_models(
                user_id=current_user.id,
                openai_model=data.openai_model,
                anthropic_model=data.anthropic_model
            )

        return ApiResponse.ok(
            data=UserSettingsResponse(
                id=user_settings.id,
                default_converter=user_settings.current_converter,
                openai_api_key_set=user_settings.has_openai_key,
                anthropic_api_key_set=user_settings.has_anthropic_key,
                openai_model=user_settings.openai_model,
                anthropic_model=user_settings.anthropic_model,
                auto_extract_images=True,
                image_quality=85
            ),
            message="設定を更新しました"
        )
    except ValidationException as e:
        raise HTTPException(status_code=422, detail={"code": e.code, "message": e.message})


@router.get("/converters", response_model=ApiResponse[ConvertersResponse])
def get_converters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """コンバーター一覧取得"""
    settings_service = SettingsService(db)
    user_settings = settings_service.get_or_create(current_user.id)

    available = [
        ConverterInfo(id=c["id"], name=c["name"], description=c["description"])
        for c in ConverterManager.get_available_converters()
    ]

    return ApiResponse.ok(
        data=ConvertersResponse(
            available=available,
            current=user_settings.current_converter
        )
    )


@router.put("/converters", response_model=ApiResponse[ConvertersResponse])
def update_converter(
    data: ConverterUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """コンバーター設定更新"""
    try:
        settings_service = SettingsService(db)
        user_settings = settings_service.update_converter(current_user.id, data.current_converter)

        available = [
            ConverterInfo(id=c["id"], name=c["name"], description=c["description"])
            for c in ConverterManager.get_available_converters()
        ]

        return ApiResponse.ok(
            data=ConvertersResponse(
                available=available,
                current=user_settings.current_converter
            ),
            message="コンバーター設定を更新しました"
        )
    except ValidationException as e:
        raise HTTPException(status_code=422, detail={"code": e.code, "message": e.message})


@router.put("/api-keys", response_model=ApiResponse[ApiKeyStatusResponse])
def update_api_keys(
    data: ApiKeyUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """APIキー設定更新"""
    settings_service = SettingsService(db)
    user_settings = settings_service.update_api_keys(
        user_id=current_user.id,
        openai_api_key=data.openai_api_key,
        anthropic_api_key=data.anthropic_api_key
    )

    return ApiResponse.ok(
        data=ApiKeyStatusResponse(
            openai_api_key_set=user_settings.has_openai_key,
            anthropic_api_key_set=user_settings.has_anthropic_key
        ),
        message="APIキーを更新しました"
    )


@router.get("/models", response_model=ApiResponse[ModelsResponse])
def get_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """モデル一覧取得"""
    settings_service = SettingsService(db)
    user_settings = settings_service.get_or_create(current_user.id)

    openai_models = [
        ModelInfo(id="gpt-4o-mini", name="GPT-4o Mini", description="高速・低コスト"),
        ModelInfo(id="gpt-4o", name="GPT-4o", description="高精度")
    ]

    anthropic_models = [
        ModelInfo(id="claude-3-haiku-20240307", name="Claude 3 Haiku", description="高速・低コスト"),
        ModelInfo(id="claude-3-5-sonnet-20241022", name="Claude 3.5 Sonnet", description="高精度")
    ]

    return ApiResponse.ok(
        data=ModelsResponse(
            openai_models=openai_models,
            anthropic_models=anthropic_models,
            current=ModelCurrentSettings(
                openai_model=user_settings.openai_model,
                anthropic_model=user_settings.anthropic_model
            )
        )
    )


@router.put("/models", response_model=ApiResponse[ModelCurrentSettings])
def update_models(
    data: ModelUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """モデル設定更新"""
    try:
        settings_service = SettingsService(db)
        user_settings = settings_service.update_models(
            user_id=current_user.id,
            openai_model=data.openai_model,
            anthropic_model=data.anthropic_model
        )

        return ApiResponse.ok(
            data=ModelCurrentSettings(
                openai_model=user_settings.openai_model,
                anthropic_model=user_settings.anthropic_model
            ),
            message="モデル設定を更新しました"
        )
    except ValidationException as e:
        raise HTTPException(status_code=422, detail={"code": e.code, "message": e.message})
