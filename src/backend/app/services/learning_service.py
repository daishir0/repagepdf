"""
学習サービス
URLからコーディングルールを学習
"""
import asyncio
import json
import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.models import Template, UserSettings
from app.core.config import settings
from app.core.security import security_service
from app.core.exceptions import LLMException

logger = logging.getLogger(__name__)


class LearningService:
    """学習サービスクラス"""

    def __init__(self, db: Session):
        self.db = db

    async def learn_from_urls(self, template: Template, user_settings: UserSettings) -> dict:
        """URLからコーディングルールを学習"""
        from app.services.template_service import TemplateService
        template_service = TemplateService(self.db)

        # ステータスを学習中に更新
        template_service.set_learning_status(template)

        try:
            # URLからHTML取得
            urls = template.urls
            html_contents = []

            for url in urls:
                html = await self._fetch_page(url)
                html_contents.append({
                    "url": url,
                    "html": html[:50000]  # 最大50KB
                })

            # LLMでルール生成
            rules = await self._generate_rules(html_contents, user_settings)

            # 結果保存
            rules_json = json.dumps(rules, ensure_ascii=False)
            template_service.set_ready_status(template, rules_json)

            return rules

        except Exception as e:
            logger.error(f"Learning failed for template {template.id}: {e}")
            template_service.set_error_status(template, str(e))
            raise

    async def _fetch_page(self, url: str) -> str:
        """Playwrightでページを取得"""
        try:
            from playwright.async_api import async_playwright

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    viewport={"width": 1920, "height": 1080}
                )
                page = await context.new_page()

                # ページ読み込み
                await page.goto(url, wait_until="networkidle", timeout=60000)
                await page.wait_for_timeout(2000)

                # HTML取得
                html = await page.content()

                await browser.close()
                return html

        except Exception as e:
            logger.error(f"Failed to fetch page {url}: {e}")
            raise LLMException(f"ページの取得に失敗しました: {url}")

    async def _generate_rules(self, html_contents: list, user_settings: UserSettings) -> dict:
        """LLMでコーディングルールを生成"""
        # プロンプト構築
        prompt = self._build_learning_prompt(html_contents)

        # APIキーの復号
        openai_key = None
        anthropic_key = None

        if user_settings.openai_api_key_enc:
            openai_key = security_service.decrypt_api_key(user_settings.openai_api_key_enc)
        if user_settings.anthropic_api_key_enc:
            anthropic_key = security_service.decrypt_api_key(user_settings.anthropic_api_key_enc)

        # 利用可能なLLMを選択
        if anthropic_key:
            return await self._call_anthropic(prompt, anthropic_key, user_settings.anthropic_model)
        elif openai_key:
            return await self._call_openai(prompt, openai_key, user_settings.openai_model)
        else:
            raise LLMException("LLM APIキーが設定されていません")

    def _build_learning_prompt(self, html_contents: list) -> str:
        """学習用プロンプトを構築"""
        html_summary = "\n\n".join([
            f"【URL: {item['url']}】\n{item['html'][:15000]}"
            for item in html_contents
        ])

        return f"""あなたはWebサイトのデザインとコーディングパターンを分析するエキスパートです。
以下の複数のHTMLページを分析し、PDFコンテンツをこのサイトのスタイルでHTML化するためのルールを抽出してください。

【分析対象】
{html_summary}

【出力形式】
必ず以下のJSON形式で出力してください。他の説明は不要です。

{{
  "site_name": "サイト名",
  "base_url": "ベースURL",
  "design_system": {{
    "colors": {{
      "primary": "#主要色",
      "secondary": "#副色",
      "background": "#背景色",
      "text": "#テキスト色",
      "accent": "#アクセント色"
    }},
    "typography": {{
      "font_family": "フォントファミリー",
      "base_font_size": "ベースフォントサイズ",
      "line_height": "行間"
    }}
  }},
  "html_templates": {{
    "article_wrapper": "<article class='...'>{{content}}</article>のような記事全体のラッパーHTML",
    "heading_h1": "<h1 class='...'>{{text}}</h1>のようなH1のHTMLパターン",
    "heading_h2": "<h2 class='...'>{{text}}</h2>のようなH2のHTMLパターン",
    "heading_h3": "<h3 class='...'>{{text}}</h3>のようなH3のHTMLパターン",
    "paragraph": "<p class='...'>{{text}}</p>のような段落のHTMLパターン",
    "unordered_list": "<ul class='...'><li>{{item}}</li></ul>のようなリストのHTMLパターン",
    "ordered_list": "<ol class='...'><li>{{item}}</li></ol>のような番号付きリストのHTMLパターン",
    "table": "<table class='...'><thead>...</thead><tbody>...</tbody></table>のようなテーブルのHTMLパターン",
    "blockquote": "<blockquote class='...'>{{text}}</blockquote>のような引用のHTMLパターン",
    "emphasis_box": "強調ボックスやコールアウトのHTMLパターン（あれば）",
    "dialogue_box": "対話形式やQ&AボックスのHTMLパターン（あれば）"
  }},
  "inline_css": "必要な場合のインラインCSS（<style>タグの中身）。フォント、色、レイアウトのスタイルを含める。最大2000文字程度に抑える",
  "special_features": [
    "このサイト特有のデザイン特徴を3-5項目で記載"
  ],
  "conversion_instructions": "PDFテキストをこのサイトのスタイルでHTMLに変換する際の具体的な指示（200文字程度）"
}}

重要：
- html_templatesには実際に使えるHTMLスニペットを記載してください
- inline_cssにはそのまま<style>タグに入れて使えるCSSを記載してください
- 特にこのサイト特有のデザイン要素（吹き出し、色付きボックスなど）を抽出してください"""

    async def _call_openai(self, prompt: str, api_key: str, model: str) -> dict:
        """OpenAI APIを呼び出し"""
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=api_key)
            response = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4000,
                temperature=0.3
            )

            content = response.choices[0].message.content
            return self._parse_json_response(content)

        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise LLMException(f"OpenAI APIエラー: {str(e)}")

    async def _call_anthropic(self, prompt: str, api_key: str, model: str) -> dict:
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
            return self._parse_json_response(content)

        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise LLMException(f"Anthropic APIエラー: {str(e)}")

    def _parse_json_response(self, content: str) -> dict:
        """LLMレスポンスからJSONを抽出"""
        import re

        try:
            # コードブロックを除去
            if "```json" in content:
                start = content.find("```json") + 7
                end = content.find("```", start)
                if end > start:
                    content = content[start:end].strip()
            elif "```" in content:
                start = content.find("```") + 3
                end = content.find("```", start)
                if end > start:
                    content = content[start:end].strip()

            # JSON部分を抽出
            if "{" in content and "}" in content:
                json_start = content.find("{")
                json_end = content.rfind("}") + 1
                json_str = content[json_start:json_end]

                # まずそのまま解析を試行
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    pass

                # JSON文字列内の改行をエスケープ
                # 文字列値の中の実際の改行を \n に置換
                def escape_newlines_in_strings(s):
                    # 文字列リテラルを検出して改行をエスケープ
                    result = []
                    in_string = False
                    escape_next = False
                    i = 0
                    while i < len(s):
                        c = s[i]
                        if escape_next:
                            result.append(c)
                            escape_next = False
                        elif c == '\\':
                            result.append(c)
                            escape_next = True
                        elif c == '"':
                            result.append(c)
                            in_string = not in_string
                        elif in_string and c == '\n':
                            result.append('\\n')
                        elif in_string and c == '\r':
                            result.append('\\r')
                        elif in_string and c == '\t':
                            result.append('\\t')
                        else:
                            result.append(c)
                        i += 1
                    return ''.join(result)

                json_str_escaped = escape_newlines_in_strings(json_str)

                try:
                    return json.loads(json_str_escaped)
                except json.JSONDecodeError:
                    # 最終手段: すべての改行をエスケープ
                    json_str_all_escaped = json_str.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
                    # 二重エスケープを修正
                    json_str_all_escaped = json_str_all_escaped.replace('\\\\n', '\\n').replace('\\\\r', '\\r').replace('\\\\t', '\\t')
                    return json.loads(json_str_all_escaped)

            else:
                logger.error(f"JSON not found in response: {content[:500]}")
                raise ValueError("JSON not found in response")
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            logger.error(f"Content (first 1000 chars): {content[:1000]}")
            raise LLMException("LLMの応答をJSONとして解析できませんでした")
