"""
Batchスキーマ（Pydantic）
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from app.schemas.conversion import ConversionResponse


class BatchCreateRequest(BaseModel):
    """バッチ作成リクエストスキーマ"""
    template_id: int
    converter_type: str = Field(..., pattern=r'^(pymupdf|pdfplumber|openai_vision|claude_vision)$')


class BatchResponse(BaseModel):
    """バッチレスポンススキーマ"""
    id: str
    template_id: int
    converter_type: str
    status: str
    total_files: int
    completed_files: int
    failed_files: int
    created_at: datetime
    updated_at: datetime

    @property
    def progress_percent(self) -> int:
        """進捗率を計算"""
        if self.total_files == 0:
            return 0
        return int((self.completed_files + self.failed_files) / self.total_files * 100)

    class Config:
        from_attributes = True


class BatchDetailResponse(BatchResponse):
    """バッチ詳細レスポンススキーマ"""
    conversions: List[ConversionResponse] = []

    class Config:
        from_attributes = True


class BatchListResponse(BaseModel):
    """バッチ一覧レスポンススキーマ"""
    items: List[BatchResponse]
    total: int


class BatchProgressUpdate(BaseModel):
    """バッチ進捗更新スキーマ（内部用）"""
    completed_files: Optional[int] = None
    failed_files: Optional[int] = None
    status: Optional[str] = None
