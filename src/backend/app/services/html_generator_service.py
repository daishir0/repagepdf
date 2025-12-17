"""
HTML生成サービス
学習したテンプレートルールを使用してPDFテキストをスタイル付きHTMLに変換
"""
import json
import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.models import Template, UserSettings
from app.core.security import security_service
from app.core.exceptions import LLMException

logger = logging.getLogger(__name__)


class HtmlGeneratorService:
    """HTML生成サービスクラス"""

    def __init__(self, db: Session):
        self.db = db

    async def generate_styled_html(
        self,
        pdf_text: str,
        template: Template,
        user_settings: UserSettings
    ) -> str:
        """学習したテンプレートルールを使用してスタイル付きHTMLを生成"""

        # 学習ルールを取得
        if not template.learned_rules:
            logger.warning(f"Template {template.id} has no learned rules, using basic conversion")
            return self._basic_html_wrap(pdf_text)

        try:
            rules = json.loads(template.learned_rules)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse learned rules for template {template.id}")
            return self._basic_html_wrap(pdf_text)

        # 長いテキストはLLM処理をスキップしてスタイルのみ適用
        MAX_TEXT_LENGTH_FOR_LLM = 15000  # 15KB以上のテキストはスキップ
        if len(pdf_text) > MAX_TEXT_LENGTH_FOR_LLM:
            logger.info(f"Text too long ({len(pdf_text)} chars), using styled basic conversion")
            return self._styled_basic_html_wrap(pdf_text, rules)

        # APIキーの復号
        openai_key = None
        anthropic_key = None

        if user_settings.openai_api_key_enc:
            openai_key = security_service.decrypt_api_key(user_settings.openai_api_key_enc)
        if user_settings.anthropic_api_key_enc:
            anthropic_key = security_service.decrypt_api_key(user_settings.anthropic_api_key_enc)

        # LLMでHTML生成
        prompt = self._build_generation_prompt(pdf_text, rules)

        try:
            if anthropic_key:
                html = await self._call_anthropic(prompt, anthropic_key, user_settings.anthropic_model)
            elif openai_key:
                html = await self._call_openai(prompt, openai_key, user_settings.openai_model)
            else:
                logger.warning("No LLM API key available, using basic conversion")
                return self._styled_basic_html_wrap(pdf_text, rules)

            # CSSを追加
            styled_html = self._add_styles(html, rules)
            return styled_html
        except Exception as e:
            logger.warning(f"LLM HTML generation failed: {e}, using styled basic conversion")
            return self._styled_basic_html_wrap(pdf_text, rules)

    def _build_generation_prompt(self, pdf_text: str, rules: dict) -> str:
        """HTML生成用プロンプトを構築"""

        # ルールから情報を抽出
        site_name = rules.get("site_name", "")
        html_templates = rules.get("html_templates", {})
        special_features = rules.get("special_features", [])
        conversion_instructions = rules.get("conversion_instructions", "")

        # HTMLテンプレート情報を整形
        templates_info = json.dumps(html_templates, ensure_ascii=False, indent=2) if html_templates else "なし"
        features_info = "\n".join(f"- {f}" for f in special_features) if special_features else "なし"

        # PDFテキストを制限（長すぎる場合）
        max_text_length = 30000
        if len(pdf_text) > max_text_length:
            pdf_text = pdf_text[:max_text_length] + "\n\n[... 以下省略 ...]"

        return f"""あなたはPDFテキストをWebページのHTMLに変換するエキスパートです。
以下のPDFテキストを、指定されたサイトのデザインスタイルに合わせてHTMLに変換してください。

【サイト情報】
サイト名: {site_name}

【HTMLテンプレート】
{templates_info}

【このサイトの特徴】
{features_info}

【変換指示】
{conversion_instructions}

【PDFテキスト】
{pdf_text}

【出力形式】
- 完全なHTML本文のみを出力してください（<!DOCTYPE>やhead要素は不要）
- 上記のHTMLテンプレートのクラス名やスタイルを使用してください
- 見出し、段落、リスト、表などを適切にマークアップしてください
- 元のテキストの構造（見出し階層、箇条書き、表など）を維持してください
- このサイトの特徴的なデザイン要素を活用してください
- 重要な箇所は強調ボックスなどを使って目立たせてください

HTMLを出力してください："""

    async def _call_openai(self, prompt: str, api_key: str, model: str) -> str:
        """OpenAI APIを呼び出し"""
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=api_key)
            response = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4096,
                temperature=0.3
            )

            content = response.choices[0].message.content
            return self._extract_html(content)

        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise LLMException(f"OpenAI APIエラー: {str(e)}")

    async def _call_anthropic(self, prompt: str, api_key: str, model: str) -> str:
        """Anthropic APIを呼び出し"""
        try:
            import anthropic

            # モデルに応じたmax_tokensを設定
            max_tokens = 4096  # デフォルト（haiku用）
            if "sonnet" in model or "opus" in model:
                max_tokens = 8000

            client = anthropic.AsyncAnthropic(api_key=api_key)
            response = await client.messages.create(
                model=model,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text
            return self._extract_html(content)

        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise LLMException(f"Anthropic APIエラー: {str(e)}")

    def _extract_html(self, content: str) -> str:
        """LLMレスポンスからHTMLを抽出"""
        # コードブロックがある場合は抽出
        if "```html" in content:
            start = content.find("```html") + 7
            end = content.find("```", start)
            if end > start:
                return content[start:end].strip()

        if "```" in content:
            start = content.find("```") + 3
            end = content.find("```", start)
            if end > start:
                return content[start:end].strip()

        # そのまま返す
        return content.strip()

    def _add_styles(self, html: str, rules: dict) -> str:
        """学習したCSSスタイルを追加"""
        inline_css = rules.get("inline_css", "")
        design_system = rules.get("design_system", {})

        # デザインシステムからCSS生成
        css_parts = []

        if inline_css:
            css_parts.append(inline_css)

        # 色とタイポグラフィの基本スタイルを追加
        colors = design_system.get("colors", {})
        typography = design_system.get("typography", {})

        base_css = []
        if colors:
            base_css.append(f"""
.repage-content {{
    color: {colors.get('text', '#333')};
    background-color: {colors.get('background', '#fff')};
}}
.repage-content a {{
    color: {colors.get('primary', '#0066cc')};
}}
.repage-content h1, .repage-content h2, .repage-content h3 {{
    color: {colors.get('primary', '#333')};
}}
""")

        if typography:
            base_css.append(f"""
.repage-content {{
    font-family: {typography.get('font_family', 'sans-serif')};
    font-size: {typography.get('base_font_size', '16px')};
    line-height: {typography.get('line_height', '1.8')};
}}
""")

        # デフォルトスタイル
        default_css = """
.repage-content {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
}
.repage-content h1 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #333;
}
.repage-content h2 {
    font-size: 1.4rem;
    margin-top: 2rem;
    margin-bottom: 1rem;
}
.repage-content h3 {
    font-size: 1.2rem;
    margin-top: 1.5rem;
    margin-bottom: 0.8rem;
}
.repage-content p {
    margin-bottom: 1rem;
}
.repage-content ul, .repage-content ol {
    margin-bottom: 1rem;
    padding-left: 2rem;
}
.repage-content li {
    margin-bottom: 0.5rem;
}
.repage-content table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.5rem;
}
.repage-content th, .repage-content td {
    border: 1px solid #ddd;
    padding: 0.75rem;
    text-align: left;
}
.repage-content th {
    background-color: #f5f5f5;
    font-weight: bold;
}
.repage-content blockquote {
    border-left: 4px solid #ddd;
    padding-left: 1rem;
    margin: 1rem 0;
    color: #666;
}
.emphasis-box {
    background-color: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    padding: 1rem;
    margin: 1rem 0;
}
.dialogue-box {
    background-color: #e7f3ff;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    position: relative;
}
.pdf-images {
    margin: 2rem 0;
    padding: 1rem;
    background-color: #f9f9f9;
    border-radius: 8px;
}
.pdf-image {
    margin: 1rem 0;
    text-align: center;
}
.pdf-image img {
    max-width: 100%;
    height: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
"""

        css_parts.append(default_css)
        css_parts.extend(base_css)

        # 完全なHTMLを構築
        full_css = "\n".join(css_parts)

        styled_html = f"""<style>
{full_css}
</style>
<div class="repage-content">
{html}
</div>"""

        return styled_html

    def _basic_html_wrap(self, text: str) -> str:
        """基本的なHTML変換（LLMなしの場合）"""
        # ページ区切りを除去
        text = text.replace("--- Page", "\n\n---\n\n### Page")

        # 基本的なHTML化
        paragraphs = text.split("\n\n")
        html_parts = []

        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            if p.startswith("###"):
                html_parts.append(f"<h3>{p[3:].strip()}</h3>")
            elif p.startswith("##"):
                html_parts.append(f"<h2>{p[2:].strip()}</h2>")
            elif p.startswith("#"):
                html_parts.append(f"<h1>{p[1:].strip()}</h1>")
            else:
                html_parts.append(f"<p>{p}</p>")

        basic_html = "\n".join(html_parts)

        return f"""<style>
.repage-content {{
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
    font-family: sans-serif;
    line-height: 1.8;
}}
.repage-content h1, .repage-content h2, .repage-content h3 {{
    margin-top: 1.5rem;
}}
.repage-content p {{
    margin-bottom: 1rem;
}}
.pdf-images {{
    margin: 2rem 0;
    padding: 1rem;
    background-color: #f9f9f9;
    border-radius: 8px;
}}
.pdf-image {{
    margin: 1rem 0;
    text-align: center;
}}
.pdf-image img {{
    max-width: 100%;
    height: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}}
</style>
<div class="repage-content">
{basic_html}
</div>"""

    def _styled_basic_html_wrap(self, text: str, rules: dict) -> str:
        """学習したスタイルを適用した基本HTML変換（LLMなし、長いテキスト用）"""
        # ページ区切りを除去
        text = text.replace("--- Page", "\n\n---\n\n### Page")

        # 基本的なHTML化
        paragraphs = text.split("\n\n")
        html_parts = []

        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            if p.startswith("###"):
                html_parts.append(f"<h3>{p[3:].strip()}</h3>")
            elif p.startswith("##"):
                html_parts.append(f"<h2>{p[2:].strip()}</h2>")
            elif p.startswith("#"):
                html_parts.append(f"<h1>{p[1:].strip()}</h1>")
            else:
                html_parts.append(f"<p>{p}</p>")

        basic_html = "\n".join(html_parts)

        # 学習したスタイルを適用
        return self._add_styles(basic_html, rules)
