"""
認証API
ログイン、ログアウト、認証状態確認
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models import User
from app.schemas import UserLogin, UserResponse, TokenResponse, ApiResponse
from app.services import AuthService
from app.core.exceptions import InvalidCredentialsException

router = APIRouter(prefix="/auth", tags=["認証"])


@router.post("/login", response_model=ApiResponse[TokenResponse])
def login(data: UserLogin, db: Session = Depends(get_db)):
    """ログイン"""
    try:
        auth_service = AuthService(db)
        token_response = auth_service.authenticate(data.email, data.password)
        return ApiResponse.ok(data=token_response)
    except InvalidCredentialsException as e:
        raise HTTPException(
            status_code=401,
            detail={"code": e.code, "message": e.message}
        )


@router.post("/logout", response_model=ApiResponse[None])
def logout(current_user: User = Depends(get_current_user)):
    """ログアウト"""
    # JWTはステートレスなので、サーバー側でのログアウト処理は不要
    # クライアント側でトークンを削除する
    return ApiResponse.ok(message="ログアウトしました")


@router.get("/me", response_model=ApiResponse[UserResponse])
def get_me(current_user: User = Depends(get_current_user)):
    """認証状態確認"""
    return ApiResponse.ok(
        data=UserResponse(
            id=current_user.id,
            email=current_user.email,
            name=current_user.name,
            created_at=current_user.created_at
        )
    )
