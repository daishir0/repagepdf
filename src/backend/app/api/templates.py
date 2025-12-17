"""
テンプレートAPI
テンプレートのCRUD、学習実行
"""
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models import User
from app.infrastructure.database import SessionLocal
from app.schemas import (
    ApiResponse, TemplateCreate, TemplateResponse,
    TemplateDetailResponse, TemplateListResponse, LearnResponse
)
from app.services import TemplateService, LearningService, SettingsService
from app.core.exceptions import (
    TemplateNotFoundException, TemplateHasConversionsException,
    TemplateNotReadyException
)

router = APIRouter(prefix="/templates", tags=["テンプレート"])


@router.get("", response_model=ApiResponse[TemplateListResponse])
def get_templates(
    status: Optional[str] = Query(None, description="ステータスフィルタ"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """テンプレート一覧取得"""
    template_service = TemplateService(db)
    templates, total = template_service.get_list(
        user_id=current_user.id,
        status=status,
        page=page,
        limit=limit
    )

    return ApiResponse.ok(
        data=TemplateListResponse(
            items=[TemplateResponse.model_validate(t) for t in templates],
            total=total,
            page=page,
            limit=limit,
            has_next=(page * limit) < total
        )
    )


@router.post("", response_model=ApiResponse[TemplateResponse])
def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """テンプレート作成"""
    template_service = TemplateService(db)
    template = template_service.create(current_user.id, data)

    return ApiResponse.ok(
        data=TemplateResponse.model_validate(template),
        message="テンプレートを作成しました"
    )


@router.get("/{template_id}", response_model=ApiResponse[TemplateDetailResponse])
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """テンプレート詳細取得"""
    try:
        template_service = TemplateService(db)
        template = template_service.get_by_id(template_id, current_user.id)

        # learned_rulesをパース
        learned_rules = None
        if template.learned_rules:
            try:
                learned_rules = json.loads(template.learned_rules)
            except json.JSONDecodeError:
                learned_rules = template.learned_rules

        return ApiResponse.ok(
            data=TemplateDetailResponse(
                id=template.id,
                name=template.name,
                url1=template.url1,
                url2=template.url2,
                url3=template.url3,
                status=template.status,
                learned_rules=learned_rules,
                error_message=template.error_message,
                created_at=template.created_at,
                updated_at=template.updated_at
            )
        )
    except TemplateNotFoundException as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})


@router.delete("/{template_id}", response_model=ApiResponse[None])
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """テンプレート削除"""
    try:
        template_service = TemplateService(db)
        template_service.delete(template_id, current_user.id)
        return ApiResponse.ok(message="テンプレートを削除しました")
    except TemplateNotFoundException as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})
    except TemplateHasConversionsException as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})


@router.post("/{template_id}/learn", response_model=ApiResponse[LearnResponse])
async def learn_template(
    template_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """URL学習実行"""
    try:
        template_service = TemplateService(db)
        template = template_service.get_by_id(template_id, current_user.id)
        user_id = current_user.id  # Save IDs for background task

        # バックグラウンドで学習実行（新しいDBセッションを使用）
        async def run_learning():
            bg_db = SessionLocal()
            try:
                bg_template_service = TemplateService(bg_db)
                bg_settings_service = SettingsService(bg_db)
                bg_template = bg_template_service.get_by_id(template_id, user_id)
                bg_user_settings = bg_settings_service.get_or_create(user_id)

                learning_service = LearningService(bg_db)
                await learning_service.learn_from_urls(bg_template, bg_user_settings)
            finally:
                bg_db.close()

        background_tasks.add_task(run_learning)

        return ApiResponse.ok(
            data=LearnResponse(
                id=template.id,
                status="learning",
                message="学習処理を開始しました"
            )
        )
    except TemplateNotFoundException as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})
