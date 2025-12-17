"""
APIルーター
"""
from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.templates import router as templates_router
from app.api.conversions import router as conversions_router
from app.api.settings import router as settings_router

# メインルーター
api_router = APIRouter()

# 各ルーターを登録
api_router.include_router(auth_router)
api_router.include_router(templates_router)
api_router.include_router(conversions_router)
api_router.include_router(settings_router)

__all__ = ["api_router"]
