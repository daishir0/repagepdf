"""
PDFコンバーター
Strategy Patternによる複数コンバーター切り替え
"""
from app.converters.base import (
    ConverterInterface, ExtractedImage, Table, ConversionResult
)
from app.converters.pymupdf_converter import PyMuPDFConverter
from app.converters.pdfplumber_converter import PdfPlumberConverter
from app.converters.openai_converter import OpenAIVisionConverter
from app.converters.claude_converter import ClaudeVisionConverter
from app.converters.manager import ConverterManager

__all__ = [
    "ConverterInterface", "ExtractedImage", "Table", "ConversionResult",
    "PyMuPDFConverter", "PdfPlumberConverter",
    "OpenAIVisionConverter", "ClaudeVisionConverter",
    "ConverterManager"
]
