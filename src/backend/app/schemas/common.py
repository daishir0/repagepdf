"""
共通スキーマ（Pydantic）
"""
from pydantic import BaseModel
from typing import Optional, Any, Dict, Generic, TypeVar

T = TypeVar('T')


class ErrorDetail(BaseModel):
    """エラー詳細スキーマ"""
    code: str
    message: str


class ApiResponse(BaseModel, Generic[T]):
    """APIレスポンス共通スキーマ"""
    success: bool
    data: Optional[T] = None
    message: Optional[str] = None
    error: Optional[ErrorDetail] = None

    @classmethod
    def ok(cls, data: T = None, message: str = None) -> "ApiResponse[T]":
        """成功レスポンスを作成"""
        return cls(success=True, data=data, message=message)

    @classmethod
    def fail(cls, code: str, message: str) -> "ApiResponse[None]":
        """失敗レスポンスを作成"""
        return cls(success=False, error=ErrorDetail(code=code, message=message))


class PaginationParams(BaseModel):
    """ページネーションパラメータ"""
    page: int = 1
    limit: int = 20

    def offset(self) -> int:
        """オフセットを計算"""
        return (self.page - 1) * self.limit
