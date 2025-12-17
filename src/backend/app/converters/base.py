"""
コンバーター抽象基底クラス
Strategy Patternの抽象クラス定義
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class ExtractedImage:
    """抽出画像データクラス"""
    data: bytes
    page_number: int
    order_in_page: int
    width: int
    height: int
    mime_type: str


@dataclass
class Table:
    """抽出テーブルデータクラス"""
    headers: List[str]
    rows: List[List[str]]
    page_number: int


@dataclass
class ConversionResult:
    """変換結果データクラス"""
    text: str
    images: List[ExtractedImage]
    tables: List[Table]
    page_count: int


class ConverterInterface(ABC):
    """コンバーター抽象基底クラス"""

    @abstractmethod
    def extract_text(self, pdf_path: str) -> str:
        """PDFからテキストを抽出"""
        pass

    @abstractmethod
    def extract_images(self, pdf_path: str) -> List[ExtractedImage]:
        """PDFから画像を抽出"""
        pass

    @abstractmethod
    def extract_tables(self, pdf_path: str) -> List[Table]:
        """PDFから表を抽出"""
        pass

    @abstractmethod
    def get_page_count(self, pdf_path: str) -> int:
        """ページ数を取得"""
        pass

    def convert(self, pdf_path: str) -> ConversionResult:
        """PDF変換を実行（テンプレートメソッド）"""
        return ConversionResult(
            text=self.extract_text(pdf_path),
            images=self.extract_images(pdf_path),
            tables=self.extract_tables(pdf_path),
            page_count=self.get_page_count(pdf_path)
        )
