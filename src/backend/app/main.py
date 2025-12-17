"""
RePage PDF - FastAPIアプリケーション
PDFをHTMLに変換するWebアプリケーション
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import AppException
from app.infrastructure.database import init_db, engine, Base
from app.api import api_router

# ログ設定
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    # 起動時
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # データベース初期化
    init_db()
    logger.info("Database initialized")

    # 初期ユーザー作成（存在しない場合）
    _create_initial_user()

    yield

    # 終了時
    logger.info("Shutting down...")


def _create_initial_user():
    """初期管理者ユーザーを作成"""
    from app.infrastructure.database import SessionLocal
    from app.models import User, UserSettings
    from app.core.security import security_service

    db = SessionLocal()
    try:
        # 既存ユーザーチェック
        existing = db.query(User).filter(User.email == "admin@example.com").first()
        if existing:
            logger.info("Admin user already exists")
            return

        # 管理者ユーザー作成
        admin = User(
            email="admin@example.com",
            password_hash=security_service.hash_password("admin123"),
            name="管理者"
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        # デフォルト設定作成
        admin_settings = UserSettings(user_id=admin.id)
        db.add(admin_settings)
        db.commit()

        logger.info("Admin user created: admin@example.com / admin123")
    finally:
        db.close()


# FastAPIアプリケーション
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="PDFをサイトのコーディングルールに沿ったHTMLに変換するWebアプリケーション",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 例外ハンドラ
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """アプリケーション例外ハンドラ"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message
            }
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """一般例外ハンドラ"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "サーバー内部エラーが発生しました"
            }
        }
    )


# APIルーター登録
app.include_router(api_router, prefix="/api")


# ヘルスチェック
@app.get("/health")
def health_check():
    """ヘルスチェック"""
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}


# 開発用エントリーポイント
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
