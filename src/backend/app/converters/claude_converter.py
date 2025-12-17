"""
Claude Visionコンバーター
Claude Vision APIを使用した画像認識ベースのPDF処理
"""
from typing import List, Optional
import base64
import fitz  # PyMuPDF for PDF to image conversion
import anthropic

from app.converters.base import ConverterInterface, ExtractedImage, Table, ConversionResult


# 構造化プロンプト（日本語文書向け）
EXTRACTION_PROMPT = """あなたは日本語文書のOCR専門家です。この画像から正確にテキストを抽出し、以下のMarkdown形式で構造化してください。

【出力形式】
# 大見出し（最も大きいフォント）
## 中見出し（次に大きいフォント）
### 小見出し（太字や強調）

通常の段落テキスト

- 箇条書き項目（・●○などで始まるもの）
- 箇条書き項目

1. 番号付きリスト（(1) ① などで始まるもの）
2. 番号付きリスト

> 引用や重要な囲み

【日本語文書特有の注意事項】
- 法令番号（例：昭和45年法律第84号、平成25年法律第65号）は正確に抽出
- 括弧（（）「」）は全角を維持
- 漢数字（第一、第二）と算用数字を混同しない
- 「第１」「第２」などの章番号は全角数字を維持
- 段落の途中で改行しない

テキストを抽出してください："""


class ClaudeVisionConverter(ConverterInterface):
    """Claude Vision APIを使用したコンバーター"""

    # 画像解像度スケール（3倍で高精度OCR）
    RESOLUTION_SCALE = 3
    # 最大画像サイズ（ピクセル）
    MAX_IMAGE_DIMENSION = 4096

    def __init__(self, api_key: str, model: str = "claude-3-haiku-20240307"):
        self.api_key = api_key
        self.model = model
        self._client: Optional[anthropic.Anthropic] = None

    @property
    def client(self) -> anthropic.Anthropic:
        """Anthropicクライアントを取得（遅延初期化）"""
        if self._client is None:
            self._client = anthropic.Anthropic(api_key=self.api_key)
        return self._client

    def _pdf_page_to_base64(self, pdf_path: str, page_num: int) -> str:
        """PDFページをBase64画像に変換（高解像度）"""
        doc = fitz.open(pdf_path)
        page = doc[page_num]

        # 3倍の解像度でレンダリング（OCR精度向上）
        scale = self.RESOLUTION_SCALE
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale))

        # サイズ上限チェック（4096px以上なら縮小）
        if pix.width > self.MAX_IMAGE_DIMENSION or pix.height > self.MAX_IMAGE_DIMENSION:
            ratio = self.MAX_IMAGE_DIMENSION / max(pix.width, pix.height)
            new_scale = scale * ratio
            pix = page.get_pixmap(matrix=fitz.Matrix(new_scale, new_scale))

        img_data = pix.tobytes("png")

        doc.close()
        return base64.b64encode(img_data).decode("utf-8")

    def _get_max_tokens(self) -> int:
        """モデルに応じたmax_tokensを返す"""
        # Haikuは4096まで、Sonnet/Opusは8000まで
        if "haiku" in self.model:
            return 4096
        else:
            return 8000

    def extract_text(self, pdf_path: str) -> str:
        """PDFからテキストを抽出（Vision APIを使用）"""
        doc = fitz.open(pdf_path)
        page_count = len(doc)
        doc.close()

        text_parts = []

        for page_num in range(page_count):
            base64_image = self._pdf_page_to_base64(pdf_path, page_num)

            response = self.client.messages.create(
                model=self.model,
                max_tokens=self._get_max_tokens(),  # モデルに応じて動的に設定
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": EXTRACTION_PROMPT
                            },
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": base64_image
                                }
                            }
                        ]
                    }
                ]
            )

            extracted_text = response.content[0].text
            if extracted_text:
                text_parts.append(f"--- Page {page_num + 1} ---\n{extracted_text}")

        return "\n\n".join(text_parts)

    def extract_images(self, pdf_path: str) -> List[ExtractedImage]:
        """PDFから画像を抽出（PyMuPDFを使用）"""
        # 画像抽出はPyMuPDFに委譲
        from app.converters.pymupdf_converter import PyMuPDFConverter
        pymupdf = PyMuPDFConverter()
        return pymupdf.extract_images(pdf_path)

    def extract_tables(self, pdf_path: str) -> List[Table]:
        """PDFから表を抽出（Vision APIを使用）"""
        doc = fitz.open(pdf_path)
        page_count = len(doc)
        doc.close()

        tables = []

        for page_num in range(page_count):
            base64_image = self._pdf_page_to_base64(pdf_path, page_num)

            response = self.client.messages.create(
                model=self.model,
                max_tokens=4000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """この画像に表がある場合、すべての表を抽出してください。
                                各表は以下のJSON形式で出力してください:
                                {"tables": [{"headers": ["列1", "列2"], "rows": [["値1", "値2"], ...]}]}
                                表がない場合は {"tables": []} を返してください。"""
                            },
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": base64_image
                                }
                            }
                        ]
                    }
                ]
            )

            try:
                import json
                content = response.content[0].text
                # JSONを抽出
                if "{" in content and "}" in content:
                    json_start = content.find("{")
                    json_end = content.rfind("}") + 1
                    json_str = content[json_start:json_end]
                    data = json.loads(json_str)

                    for table_data in data.get("tables", []):
                        tables.append(Table(
                            headers=table_data.get("headers", []),
                            rows=table_data.get("rows", []),
                            page_number=page_num + 1
                        ))
            except (json.JSONDecodeError, KeyError):
                continue

        return tables

    def get_page_count(self, pdf_path: str) -> int:
        """ページ数を取得"""
        doc = fitz.open(pdf_path)
        count = len(doc)
        doc.close()
        return count
