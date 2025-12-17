"""
カスタム例外クラス
"""
from typing import Optional, Any, Dict


class AppException(Exception):
    """アプリケーション基底例外"""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class BadRequestException(AppException):
    """不正なリクエスト"""

    def __init__(self, message: str = "リクエストが不正です", code: str = "BAD_REQUEST"):
        super().__init__(code=code, message=message, status_code=400)


class UnauthorizedException(AppException):
    """認証エラー"""

    def __init__(self, message: str = "認証が必要です", code: str = "UNAUTHORIZED"):
        super().__init__(code=code, message=message, status_code=401)


class ForbiddenException(AppException):
    """権限エラー"""

    def __init__(self, message: str = "アクセス権限がありません", code: str = "FORBIDDEN"):
        super().__init__(code=code, message=message, status_code=403)


class NotFoundException(AppException):
    """リソースが見つからない"""

    def __init__(self, message: str = "リソースが見つかりません", code: str = "NOT_FOUND"):
        super().__init__(code=code, message=message, status_code=404)


class ValidationException(AppException):
    """バリデーションエラー"""

    def __init__(
        self,
        message: str = "入力値が不正です",
        code: str = "VALIDATION_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(code=code, message=message, status_code=422, details=details)


class InternalServerException(AppException):
    """サーバー内部エラー"""

    def __init__(self, message: str = "サーバー内部エラーが発生しました", code: str = "INTERNAL_ERROR"):
        super().__init__(code=code, message=message, status_code=500)


# 認証関連
class InvalidCredentialsException(UnauthorizedException):
    """認証情報が無効"""

    def __init__(self):
        super().__init__(
            message="メールアドレスまたはパスワードが正しくありません",
            code="INVALID_CREDENTIALS"
        )


class TokenExpiredException(UnauthorizedException):
    """トークン期限切れ"""

    def __init__(self):
        super().__init__(message="トークンの有効期限が切れています", code="TOKEN_EXPIRED")


# テンプレート関連
class TemplateNotFoundException(NotFoundException):
    """テンプレートが見つからない"""

    def __init__(self, template_id: int):
        super().__init__(
            message=f"テンプレートID {template_id} が見つかりません",
            code="TEMPLATE_NOT_FOUND"
        )


class TemplateNotReadyException(BadRequestException):
    """テンプレートが未学習"""

    def __init__(self):
        super().__init__(
            message="テンプレートの学習が完了していません",
            code="TEMPLATE_NOT_READY"
        )


class TemplateHasConversionsException(BadRequestException):
    """テンプレートに関連する変換データが存在"""

    def __init__(self):
        super().__init__(
            message="関連する変換データが存在するため削除できません",
            code="HAS_CONVERSIONS"
        )


# 変換関連
class ConversionNotFoundException(NotFoundException):
    """変換が見つからない"""

    def __init__(self, conversion_id: int):
        super().__init__(
            message=f"変換ID {conversion_id} が見つかりません",
            code="CONVERSION_NOT_FOUND"
        )


# ファイル関連
class FileTooLargeException(BadRequestException):
    """ファイルサイズ超過"""

    def __init__(self, max_size_mb: int = 50):
        super().__init__(
            message=f"ファイルサイズが上限（{max_size_mb}MB）を超えています",
            code="FILE_TOO_LARGE"
        )


class InvalidFileTypeException(BadRequestException):
    """無効なファイル形式"""

    def __init__(self, allowed_types: str = "PDF"):
        super().__init__(
            message=f"{allowed_types}ファイルのみアップロード可能です",
            code="INVALID_FILE_TYPE"
        )


# コンバーター関連
class ConverterException(InternalServerException):
    """コンバーターエラー"""

    def __init__(self, message: str = "PDF変換中にエラーが発生しました"):
        super().__init__(message=message, code="CONVERTER_ERROR")


class UnknownConverterException(BadRequestException):
    """不明なコンバーター"""

    def __init__(self, converter_type: str):
        super().__init__(
            message=f"不明なコンバーター: {converter_type}",
            code="UNKNOWN_CONVERTER"
        )


# LLM関連
class LLMException(InternalServerException):
    """LLM APIエラー"""

    def __init__(self, message: str = "LLM APIでエラーが発生しました"):
        super().__init__(message=message, code="LLM_ERROR")
