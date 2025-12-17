"""
コンバーターマネージャー
Strategy Patternの実行管理
"""
from typing import Dict, Optional

from app.converters.base import ConverterInterface, ConversionResult
from app.converters.pymupdf_converter import PyMuPDFConverter
from app.converters.pdfplumber_converter import PdfPlumberConverter
from app.converters.openai_converter import OpenAIVisionConverter
from app.converters.claude_converter import ClaudeVisionConverter
from app.core.exceptions import UnknownConverterException


class ConverterManager:
    """コンバーター管理クラス"""

    CONVERTER_INFO = {
        "pymupdf": {
            "name": "PyMuPDF",
            "description": "高速・軽量（推奨）"
        },
        "pdfplumber": {
            "name": "pdfplumber",
            "description": "表抽出に強い"
        },
        "openai": {
            "name": "OpenAI Vision",
            "description": "画像認識ベース（API課金）"
        },
        "claude": {
            "name": "Claude Vision",
            "description": "画像認識ベース（API課金）"
        }
    }

    def __init__(
        self,
        openai_api_key: str = "",
        anthropic_api_key: str = "",
        openai_model: str = "gpt-4o-mini",
        anthropic_model: str = "claude-3-haiku-20240307",
        default_converter: str = "pymupdf"
    ):
        self.openai_api_key = openai_api_key
        self.anthropic_api_key = anthropic_api_key
        self.openai_model = openai_model
        self.anthropic_model = anthropic_model
        self.current_type = default_converter

        # コンバーターインスタンスをキャッシュ
        self._converters: Dict[str, Optional[ConverterInterface]] = {}

    def _get_or_create_converter(self, converter_type: str) -> ConverterInterface:
        """コンバーターインスタンスを取得または作成"""
        if converter_type not in self._converters:
            if converter_type == "pymupdf":
                self._converters[converter_type] = PyMuPDFConverter()
            elif converter_type == "pdfplumber":
                self._converters[converter_type] = PdfPlumberConverter()
            elif converter_type == "openai":
                self._converters[converter_type] = OpenAIVisionConverter(
                    api_key=self.openai_api_key,
                    model=self.openai_model
                )
            elif converter_type == "claude":
                self._converters[converter_type] = ClaudeVisionConverter(
                    api_key=self.anthropic_api_key,
                    model=self.anthropic_model
                )
            else:
                raise UnknownConverterException(converter_type)

        return self._converters[converter_type]

    def set_converter(self, converter_type: str):
        """使用するコンバーターを設定"""
        if converter_type not in self.CONVERTER_INFO:
            raise UnknownConverterException(converter_type)
        self.current_type = converter_type

    def get_converter(self, converter_type: Optional[str] = None) -> ConverterInterface:
        """コンバーターを取得"""
        target_type = converter_type or self.current_type
        return self._get_or_create_converter(target_type)

    def convert(self, pdf_path: str, converter_type: Optional[str] = None) -> ConversionResult:
        """PDF変換を実行"""
        converter = self.get_converter(converter_type)
        return converter.convert(pdf_path)

    def get_page_count(self, pdf_path: str) -> int:
        """ページ数を取得（PyMuPDFを使用）"""
        pymupdf = self._get_or_create_converter("pymupdf")
        return pymupdf.get_page_count(pdf_path)

    @classmethod
    def get_available_converters(cls) -> list:
        """利用可能なコンバーター一覧を取得"""
        return [
            {
                "id": key,
                "name": info["name"],
                "description": info["description"]
            }
            for key, info in cls.CONVERTER_INFO.items()
        ]

    def update_api_keys(
        self,
        openai_api_key: Optional[str] = None,
        anthropic_api_key: Optional[str] = None
    ):
        """APIキーを更新"""
        if openai_api_key is not None:
            self.openai_api_key = openai_api_key
            # OpenAIコンバーターのキャッシュをクリア
            self._converters.pop("openai", None)

        if anthropic_api_key is not None:
            self.anthropic_api_key = anthropic_api_key
            # Claudeコンバーターのキャッシュをクリア
            self._converters.pop("claude", None)

    def update_models(
        self,
        openai_model: Optional[str] = None,
        anthropic_model: Optional[str] = None
    ):
        """モデルを更新"""
        if openai_model is not None:
            self.openai_model = openai_model
            self._converters.pop("openai", None)

        if anthropic_model is not None:
            self.anthropic_model = anthropic_model
            self._converters.pop("claude", None)
