"""
pdfplumberコンバーター
表抽出に強いPDF処理
"""
from typing import List
import pdfplumber
import io
from PIL import Image

from app.converters.base import ConverterInterface, ExtractedImage, Table, ConversionResult


class PdfPlumberConverter(ConverterInterface):
    """pdfplumberを使用したコンバーター"""

    def extract_text(self, pdf_path: str) -> str:
        """PDFからテキストを抽出"""
        text_parts = []

        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text and text.strip():
                    text_parts.append(f"--- Page {page_num + 1} ---\n{text}")

        return "\n\n".join(text_parts)

    def extract_images(self, pdf_path: str) -> List[ExtractedImage]:
        """PDFから画像を抽出"""
        images = []

        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                page_images = page.images

                for img_index, img in enumerate(page_images):
                    try:
                        # pdfplumberの画像情報から画像を抽出
                        # 注意: pdfplumberは直接バイナリを提供しないので、
                        # ページを画像としてレンダリングする方法を使用
                        x0, y0, x1, y1 = img["x0"], img["top"], img["x1"], img["bottom"]
                        width = int(x1 - x0)
                        height = int(y1 - y0)

                        # 画像が小さすぎる場合はスキップ
                        if width < 10 or height < 10:
                            continue

                        # ページの該当部分を切り出し
                        cropped = page.crop((x0, y0, x1, y1))
                        pil_image = cropped.to_image(resolution=150).original

                        # バイト列に変換
                        img_buffer = io.BytesIO()
                        pil_image.save(img_buffer, format="PNG")
                        img_data = img_buffer.getvalue()

                        images.append(ExtractedImage(
                            data=img_data,
                            page_number=page_num + 1,
                            order_in_page=img_index,
                            width=width,
                            height=height,
                            mime_type="image/png"
                        ))
                    except Exception:
                        continue

        return images

    def extract_tables(self, pdf_path: str) -> List[Table]:
        """PDFから表を抽出"""
        tables = []

        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                page_tables = page.extract_tables()

                for table_data in page_tables:
                    if not table_data or len(table_data) < 2:
                        continue

                    # 最初の行をヘッダーとして扱う
                    headers = [str(cell) if cell else "" for cell in table_data[0]]
                    rows = [
                        [str(cell) if cell else "" for cell in row]
                        for row in table_data[1:]
                    ]

                    tables.append(Table(
                        headers=headers,
                        rows=rows,
                        page_number=page_num + 1
                    ))

        return tables

    def get_page_count(self, pdf_path: str) -> int:
        """ページ数を取得"""
        with pdfplumber.open(pdf_path) as pdf:
            return len(pdf.pages)
