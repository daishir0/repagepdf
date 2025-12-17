"""
PyMuPDFコンバーター
高速・軽量なPDF処理（PyMuPDF4LLMによる構造化抽出対応）
"""
from typing import List
import fitz  # PyMuPDF
import io
import logging
from PIL import Image

from app.converters.base import ConverterInterface, ExtractedImage, Table, ConversionResult

logger = logging.getLogger(__name__)


class PyMuPDFConverter(ConverterInterface):
    """PyMuPDFを使用したコンバーター（PyMuPDF4LLMによる構造化抽出対応）"""

    def extract_text(self, pdf_path: str) -> str:
        """PDFからテキストを抽出（PyMuPDF4LLMで構造化Markdown形式）"""
        try:
            # PyMuPDF4LLMを使用して構造化されたMarkdownを抽出
            import pymupdf4llm
            md_text = pymupdf4llm.to_markdown(pdf_path)
            logger.info(f"PyMuPDF4LLMで構造化テキストを抽出: {len(md_text)} chars")
            return md_text
        except ImportError:
            logger.warning("pymupdf4llmがインストールされていません。従来の方式にフォールバック")
            return self._extract_text_legacy(pdf_path)
        except Exception as e:
            logger.warning(f"PyMuPDF4LLMでエラー発生: {e}。従来の方式にフォールバック")
            return self._extract_text_legacy(pdf_path)

    def _extract_text_legacy(self, pdf_path: str) -> str:
        """従来のテキスト抽出（フォールバック用）"""
        doc = fitz.open(pdf_path)
        text_parts = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            if text.strip():
                text_parts.append(f"--- Page {page_num + 1} ---\n{text}")

        doc.close()
        return "\n\n".join(text_parts)

    def extract_images(self, pdf_path: str) -> List[ExtractedImage]:
        """PDFから画像を抽出"""
        doc = fitz.open(pdf_path)
        images = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            image_list = page.get_images(full=True)

            for img_index, img_info in enumerate(image_list):
                xref = img_info[0]
                try:
                    base_image = doc.extract_image(xref)
                    image_data = base_image["image"]
                    image_ext = base_image["ext"]

                    # 画像サイズを取得
                    img = Image.open(io.BytesIO(image_data))
                    width, height = img.size

                    # MIMEタイプを決定
                    mime_map = {
                        "png": "image/png",
                        "jpeg": "image/jpeg",
                        "jpg": "image/jpeg",
                        "gif": "image/gif",
                        "bmp": "image/bmp"
                    }
                    mime_type = mime_map.get(image_ext.lower(), "image/png")

                    images.append(ExtractedImage(
                        data=image_data,
                        page_number=page_num + 1,
                        order_in_page=img_index,
                        width=width,
                        height=height,
                        mime_type=mime_type
                    ))
                except Exception:
                    # 画像抽出に失敗した場合はスキップ
                    continue

        doc.close()
        return images

    def extract_tables(self, pdf_path: str) -> List[Table]:
        """PDFから表を抽出（PyMuPDFでは簡易実装）"""
        # PyMuPDFには高度な表抽出機能がないため、空のリストを返す
        # 表抽出が必要な場合はpdfplumberを使用することを推奨
        return []

    def get_page_count(self, pdf_path: str) -> int:
        """ページ数を取得"""
        doc = fitz.open(pdf_path)
        count = len(doc)
        doc.close()
        return count
