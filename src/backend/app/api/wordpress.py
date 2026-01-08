"""
WordPress APIルーター
WordPress連携関連のエンドポイント
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models import User, Conversion
from app.services.wordpress_service import WordPressService
from app.services.settings_service import SettingsService
from app.schemas import (
    ApiResponse,
    WPConnectionTestResponse,
    WPCategoriesResponse,
    WPTagsResponse,
    WPPublishRequest,
    WPPublishResponse,
    WPHistoryResponse,
    WPHistoryItem
)
from app.core.exceptions import (
    ConversionNotFoundException,
    WordPressNotConfiguredException
)

router = APIRouter(prefix="/wordpress", tags=["wordpress"])


@router.post("/test-connection", response_model=ApiResponse[WPConnectionTestResponse])
def test_connection(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    WordPress接続テスト
    設定されたWordPress認証情報で接続をテストする
    """
    service = WordPressService(db)
    result = service.test_connection(current_user.id)

    return ApiResponse(
        success=True,
        data=WPConnectionTestResponse(**result)
    )


@router.get("/categories", response_model=ApiResponse[WPCategoriesResponse])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    WordPressカテゴリ一覧を取得
    """
    service = WordPressService(db)
    categories = service.get_categories(current_user.id)

    return ApiResponse(
        success=True,
        data=WPCategoriesResponse(categories=categories)
    )


@router.get("/tags", response_model=ApiResponse[WPTagsResponse])
def get_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    WordPressタグ一覧を取得
    """
    service = WordPressService(db)
    tags = service.get_tags(current_user.id)

    return ApiResponse(
        success=True,
        data=WPTagsResponse(tags=tags)
    )


@router.post("/publish", response_model=ApiResponse[WPPublishResponse])
def publish(
    request: WPPublishRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    WordPressに投稿を公開
    """
    # 変換結果を取得
    conversion = db.query(Conversion).filter(
        Conversion.id == request.conversion_id,
        Conversion.user_id == current_user.id
    ).first()

    if not conversion:
        raise ConversionNotFoundException(request.conversion_id)

    if not conversion.generated_html:
        from app.core.exceptions import ValidationException
        raise ValidationException("公開するHTMLコンテンツがありません")

    service = WordPressService(db)
    result = service.publish(
        user_id=current_user.id,
        conversion_id=request.conversion_id,
        title=request.title,
        content=conversion.generated_html,
        status=request.status,
        category_ids=request.category_ids,
        tag_ids=request.tag_ids,
        new_tags=request.new_tags
    )

    return ApiResponse(
        success=True,
        data=WPPublishResponse(**result)
    )


@router.get("/history", response_model=ApiResponse[WPHistoryResponse])
def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    site: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    公開履歴一覧を取得
    """
    service = WordPressService(db)
    histories, total = service.get_history(
        user_id=current_user.id,
        page=page,
        limit=limit,
        site_filter=site,
        date_from=date_from,
        date_to=date_to
    )

    return ApiResponse(
        success=True,
        data=WPHistoryResponse(
            items=[WPHistoryItem(**h) for h in histories],
            total=total,
            page=page,
            limit=limit
        )
    )


@router.post("/history/{history_id}/retry", response_model=ApiResponse[WPPublishResponse])
def retry_publish(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    失敗した公開をリトライ
    """
    service = WordPressService(db)
    result = service.retry_publish(
        user_id=current_user.id,
        history_id=history_id
    )

    return ApiResponse(
        success=True,
        data=WPPublishResponse(**result)
    )
