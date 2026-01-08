"""
WordPressサービス
WordPress REST APIとの通信、公開処理、履歴管理を担当
"""
import base64
import json
import logging
import re
from typing import Optional, List, Tuple, Dict
from datetime import datetime
import httpx
from sqlalchemy.orm import Session

from app.models import UserSettings, Conversion, WordPressPublication
from app.core.security import security_service
from app.core.exceptions import (
    WordPressNotConfiguredException,
    WordPressConnectionException,
    WordPressAuthException,
    WordPressPublishException,
    WordPressPublicationNotFoundException,
    ConversionNotFoundException
)
from app.infrastructure.file_storage import file_storage

logger = logging.getLogger(__name__)

# WordPress REST APIエラーコードの日本語マッピング
WP_ERROR_MESSAGES = {
    "rest_cannot_create": "投稿を作成する権限がありません",
    "rest_invalid_param": "パラメータが無効です",
    "rest_user_invalid_email": "メールアドレスが無効です",
    "rest_forbidden": "この操作は許可されていません",
    "rest_post_invalid_id": "投稿IDが無効です",
    "rest_term_invalid": "カテゴリまたはタグが無効です",
    "invalid_username": "ユーザー名が無効です",
    "incorrect_password": "パスワードが正しくありません",
    "rest_cannot_edit": "この投稿を編集する権限がありません",
}


class WordPressService:
    """WordPressサービスクラス"""

    def __init__(self, db: Session):
        self.db = db
        self.timeout = 30.0  # APIタイムアウト（秒）

    def _get_user_settings(self, user_id: int) -> UserSettings:
        """ユーザー設定を取得"""
        settings = self.db.query(UserSettings).filter(
            UserSettings.user_id == user_id
        ).first()

        if not settings or not settings.has_wordpress_config:
            raise WordPressNotConfiguredException()

        return settings

    def _get_auth_header(self, settings: UserSettings) -> dict:
        """Basic認証ヘッダーを生成"""
        username = security_service.decrypt_api_key(settings.wp_username_enc)
        password = security_service.decrypt_api_key(settings.wp_app_password_enc)

        if not username or not password:
            raise WordPressAuthException("WordPress認証情報の復号化に失敗しました")

        credentials = f"{username}:{password}"
        encoded = base64.b64encode(credentials.encode()).decode()

        return {
            "Authorization": f"Basic {encoded}",
            "Content-Type": "application/json"
        }

    def _get_wp_url(self, settings: UserSettings) -> str:
        """WordPress URLを取得"""
        url = security_service.decrypt_api_key(settings.wp_url_enc)
        if not url:
            raise WordPressNotConfiguredException()

        # URLの末尾スラッシュを正規化
        return url.rstrip("/")

    def _translate_error(self, error_code: str, default_message: str) -> str:
        """WordPress APIエラーコードを日本語に変換"""
        return WP_ERROR_MESSAGES.get(error_code, default_message)

    async def _make_request(
        self,
        method: str,
        url: str,
        headers: dict,
        json_data: dict = None,
        params: dict = None
    ) -> dict:
        """WordPress REST APIリクエストを実行"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=json_data,
                    params=params
                )

                if response.status_code == 401:
                    raise WordPressAuthException()

                if response.status_code >= 400:
                    error_data = response.json() if response.text else {}
                    error_code = error_data.get("code", "unknown_error")
                    error_msg = error_data.get("message", "不明なエラー")
                    translated_msg = self._translate_error(error_code, error_msg)
                    raise WordPressPublishException(translated_msg)

                return response.json()

            except httpx.ConnectError:
                raise WordPressConnectionException("WordPressサイトに接続できません。URLを確認してください。")
            except httpx.TimeoutException:
                raise WordPressConnectionException("接続がタイムアウトしました。しばらく後に再試行してください。")
            except httpx.RequestError as e:
                logger.error(f"WordPress API request error: {e}")
                raise WordPressConnectionException(f"通信エラー: {str(e)}")

    def _extract_local_image_urls(self, html: str) -> List[Dict[str, str]]:
        """
        HTMLからローカル画像URLを抽出
        Returns: [{"url": "/api/conversions/123/images/page1_0.png", "conversion_id": "123", "filename": "page1_0.png"}]
        """
        # パターン: /api/conversions/{id}/images/{filename}
        pattern = r'/api/conversions/(\d+)/images/([^"\'>\s]+)'
        matches = re.findall(pattern, html)

        images = []
        seen = set()
        for conversion_id, filename in matches:
            url = f"/api/conversions/{conversion_id}/images/{filename}"
            if url not in seen:
                seen.add(url)
                images.append({
                    "url": url,
                    "conversion_id": conversion_id,
                    "filename": filename
                })

        return images

    async def _upload_image_to_wordpress(
        self,
        wp_url: str,
        headers: dict,
        image_data: bytes,
        filename: str
    ) -> str:
        """
        画像をWordPressメディアライブラリにアップロード
        Returns: WordPressメディアURL
        """
        # MIMEタイプを判定
        ext = filename.split('.')[-1].lower()
        mime_types = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
        }
        content_type = mime_types.get(ext, 'image/png')

        # メディアアップロード用ヘッダー
        upload_headers = {
            "Authorization": headers["Authorization"],
            "Content-Type": content_type,
            "Content-Disposition": f'attachment; filename="{filename}"'
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{wp_url}/wp-json/wp/v2/media",
                    headers=upload_headers,
                    content=image_data
                )

                if response.status_code == 401:
                    raise WordPressAuthException("メディアアップロードの認証に失敗しました")

                if response.status_code >= 400:
                    error_data = response.json() if response.text else {}
                    error_msg = error_data.get("message", "メディアアップロードに失敗しました")
                    logger.error(f"Media upload failed: {response.status_code} - {error_msg}")
                    raise WordPressPublishException(f"画像アップロード失敗: {error_msg}")

                result = response.json()
                # WordPressが返すメディアURLを取得
                media_url = result.get("source_url", "")
                logger.info(f"Image uploaded to WordPress: {filename} -> {media_url}")
                return media_url

            except httpx.RequestError as e:
                logger.error(f"Media upload request error: {e}")
                raise WordPressConnectionException(f"画像アップロード通信エラー: {str(e)}")

    async def _process_images_for_wordpress(
        self,
        html: str,
        wp_url: str,
        headers: dict
    ) -> str:
        """
        HTML内のローカル画像をWordPressにアップロードしてURLを置換
        """
        images = self._extract_local_image_urls(html)

        if not images:
            logger.info("No local images found in HTML")
            return html

        logger.info(f"Found {len(images)} local images to upload")

        for img_info in images:
            try:
                # ローカルファイルを読み込み
                file_path = f"images/{img_info['conversion_id']}/{img_info['filename']}"
                image_data = file_storage.get_file(file_path)

                if not image_data:
                    logger.warning(f"Image file not found: {file_path}")
                    continue

                # WordPressにアップロード
                wp_media_url = await self._upload_image_to_wordpress(
                    wp_url,
                    headers,
                    image_data,
                    img_info['filename']
                )

                if wp_media_url:
                    # URLを置換
                    html = html.replace(img_info['url'], wp_media_url)
                    logger.info(f"Replaced image URL: {img_info['url']} -> {wp_media_url}")

            except Exception as e:
                logger.error(f"Failed to upload image {img_info['filename']}: {e}")
                # 画像アップロード失敗は警告として続行
                continue

        return html

    def test_connection(self, user_id: int) -> dict:
        """
        WordPress接続テスト
        Returns: {valid: bool, site_name?: str, user_name?: str, error_message?: str}
        """
        import asyncio

        try:
            settings = self._get_user_settings(user_id)
            wp_url = self._get_wp_url(settings)
            headers = self._get_auth_header(settings)

            async def _test():
                # ユーザー情報を取得
                user_data = await self._make_request(
                    "GET",
                    f"{wp_url}/wp-json/wp/v2/users/me",
                    headers
                )

                # サイト情報を取得
                site_data = await self._make_request(
                    "GET",
                    f"{wp_url}/wp-json",
                    headers
                )

                return {
                    "valid": True,
                    "site_name": site_data.get("name", ""),
                    "user_name": user_data.get("name", user_data.get("slug", ""))
                }

            return asyncio.run(_test())

        except WordPressNotConfiguredException:
            return {
                "valid": False,
                "error_message": "WordPress連携が設定されていません"
            }
        except WordPressAuthException as e:
            return {
                "valid": False,
                "error_message": str(e)
            }
        except WordPressConnectionException as e:
            return {
                "valid": False,
                "error_message": str(e)
            }
        except Exception as e:
            logger.error(f"WordPress connection test error: {e}")
            return {
                "valid": False,
                "error_message": f"接続テスト中にエラーが発生しました: {str(e)}"
            }

    def get_categories(self, user_id: int) -> List[dict]:
        """
        カテゴリ一覧取得
        Returns: [{id: int, name: str, slug: str, count: int}]
        """
        import asyncio

        settings = self._get_user_settings(user_id)
        wp_url = self._get_wp_url(settings)
        headers = self._get_auth_header(settings)

        async def _get_all_categories():
            all_categories = []
            page = 1
            per_page = 100

            while True:
                data = await self._make_request(
                    "GET",
                    f"{wp_url}/wp-json/wp/v2/categories",
                    headers,
                    params={"page": page, "per_page": per_page}
                )

                if not data:
                    break

                for cat in data:
                    all_categories.append({
                        "id": cat["id"],
                        "name": cat["name"],
                        "slug": cat["slug"],
                        "count": cat["count"]
                    })

                if len(data) < per_page:
                    break

                page += 1

            return all_categories

        return asyncio.run(_get_all_categories())

    def get_tags(self, user_id: int) -> List[dict]:
        """
        タグ一覧取得
        Returns: [{id: int, name: str, slug: str, count: int}]
        """
        import asyncio

        settings = self._get_user_settings(user_id)
        wp_url = self._get_wp_url(settings)
        headers = self._get_auth_header(settings)

        async def _get_all_tags():
            all_tags = []
            page = 1
            per_page = 100

            while True:
                data = await self._make_request(
                    "GET",
                    f"{wp_url}/wp-json/wp/v2/tags",
                    headers,
                    params={"page": page, "per_page": per_page}
                )

                if not data:
                    break

                for tag in data:
                    all_tags.append({
                        "id": tag["id"],
                        "name": tag["name"],
                        "slug": tag["slug"],
                        "count": tag["count"]
                    })

                if len(data) < per_page:
                    break

                page += 1

            return all_tags

        return asyncio.run(_get_all_tags())

    def publish(
        self,
        user_id: int,
        conversion_id: int,
        title: str,
        content: str,
        status: str,
        category_ids: List[int],
        tag_ids: List[int],
        new_tags: List[str]
    ) -> dict:
        """
        WordPress投稿を作成
        Returns: {success: bool, post_id?: int, post_url?: str, admin_url?: str, error_message?: str}
        """
        import asyncio

        settings = self._get_user_settings(user_id)
        wp_url = self._get_wp_url(settings)
        headers = self._get_auth_header(settings)

        # 変換結果の確認
        conversion = self.db.query(Conversion).filter(
            Conversion.id == conversion_id,
            Conversion.user_id == user_id
        ).first()

        if not conversion:
            raise ConversionNotFoundException(conversion_id)

        async def _publish():
            # 画像をWordPressにアップロードしてURLを置換
            processed_content = await self._process_images_for_wordpress(
                content, wp_url, headers
            )

            # 新規タグの作成
            all_tag_ids = list(tag_ids)
            created_tag_names = []

            for tag_name in new_tags:
                tag_data = await self._make_request(
                    "POST",
                    f"{wp_url}/wp-json/wp/v2/tags",
                    headers,
                    json_data={"name": tag_name}
                )
                all_tag_ids.append(tag_data["id"])
                created_tag_names.append(tag_name)

            # 投稿作成
            post_data = {
                "title": title,
                "content": processed_content,
                "status": status,
                "categories": category_ids,
                "tags": all_tag_ids
            }

            result = await self._make_request(
                "POST",
                f"{wp_url}/wp-json/wp/v2/posts",
                headers,
                json_data=post_data
            )

            post_id = result["id"]
            post_url = result.get("link", "")
            admin_url = f"{wp_url}/wp-admin/post.php?post={post_id}&action=edit"

            return {
                "post_id": post_id,
                "post_url": post_url,
                "admin_url": admin_url,
                "created_tag_names": created_tag_names
            }

        try:
            result = asyncio.run(_publish())

            # 履歴を保存（成功）
            self._save_publication_history(
                user_id=user_id,
                conversion_id=conversion_id,
                wp_site_url=wp_url,
                wp_post_id=result["post_id"],
                wp_post_url=result["post_url"],
                wp_admin_url=result["admin_url"],
                title=title,
                status=status,
                category_ids=category_ids,
                tag_ids=tag_ids + [t for t in new_tags],
                publish_status="success"
            )

            return {
                "success": True,
                "post_id": result["post_id"],
                "post_url": result["post_url"],
                "admin_url": result["admin_url"]
            }

        except (WordPressAuthException, WordPressConnectionException, WordPressPublishException) as e:
            # 履歴を保存（失敗）
            self._save_publication_history(
                user_id=user_id,
                conversion_id=conversion_id,
                wp_site_url=wp_url,
                title=title,
                status=status,
                category_ids=category_ids,
                tag_ids=tag_ids,
                publish_status="failed",
                error_message=str(e)
            )
            return {
                "success": False,
                "error_message": str(e)
            }

    def _save_publication_history(
        self,
        user_id: int,
        conversion_id: int,
        wp_site_url: str,
        title: str,
        status: str,
        category_ids: List[int],
        tag_ids: List,
        publish_status: str,
        wp_post_id: int = None,
        wp_post_url: str = None,
        wp_admin_url: str = None,
        error_message: str = None
    ):
        """公開履歴を保存"""
        publication = WordPressPublication(
            user_id=user_id,
            conversion_id=conversion_id,
            wp_site_url=wp_site_url,
            wp_post_id=wp_post_id,
            wp_post_url=wp_post_url,
            wp_admin_url=wp_admin_url,
            title=title,
            status=status,
            categories=json.dumps([str(c) for c in category_ids]),
            tags=json.dumps([str(t) for t in tag_ids]),
            publish_status=publish_status,
            error_message=error_message
        )
        self.db.add(publication)
        self.db.commit()

    def get_history(
        self,
        user_id: int,
        page: int = 1,
        limit: int = 20,
        site_filter: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> Tuple[List[dict], int]:
        """
        公開履歴一覧取得
        Returns: (histories, total_count)
        """
        query = self.db.query(WordPressPublication).filter(
            WordPressPublication.user_id == user_id
        )

        # フィルター適用
        if site_filter:
            query = query.filter(WordPressPublication.wp_site_url.contains(site_filter))
        if date_from:
            query = query.filter(WordPressPublication.published_at >= date_from)
        if date_to:
            query = query.filter(WordPressPublication.published_at <= date_to)

        total = query.count()

        publications = query.order_by(WordPressPublication.published_at.desc()) \
            .offset((page - 1) * limit) \
            .limit(limit) \
            .all()

        histories = []
        for pub in publications:
            histories.append({
                "id": pub.id,
                "conversion_id": pub.conversion_id,
                "wp_site_url": pub.wp_site_url,
                "wp_post_id": pub.wp_post_id,
                "wp_post_url": pub.wp_post_url,
                "wp_admin_url": pub.wp_admin_url,
                "title": pub.title,
                "status": pub.status,
                "categories": json.loads(pub.categories) if pub.categories else [],
                "tags": json.loads(pub.tags) if pub.tags else [],
                "publish_status": pub.publish_status,
                "error_message": pub.error_message,
                "published_at": pub.published_at
            })

        return histories, total

    def retry_publish(self, user_id: int, history_id: int) -> dict:
        """
        失敗した公開をリトライ
        Returns: {success: bool, ...}
        """
        # 履歴を取得
        publication = self.db.query(WordPressPublication).filter(
            WordPressPublication.id == history_id,
            WordPressPublication.user_id == user_id
        ).first()

        if not publication:
            raise WordPressPublicationNotFoundException(history_id)

        if publication.publish_status != "failed":
            raise WordPressPublishException("失敗した公開のみリトライできます")

        if not publication.conversion_id:
            raise WordPressPublishException("変換結果が削除されているためリトライできません")

        # 変換結果からコンテンツを取得
        conversion = self.db.query(Conversion).filter(
            Conversion.id == publication.conversion_id,
            Conversion.user_id == user_id
        ).first()

        if not conversion or not conversion.generated_html:
            raise WordPressPublishException("変換結果が見つかりません")

        # リトライ実行
        return self.publish(
            user_id=user_id,
            conversion_id=publication.conversion_id,
            title=publication.title,
            content=conversion.generated_html,
            status=publication.status,
            category_ids=json.loads(publication.categories) if publication.categories else [],
            tag_ids=json.loads(publication.tags) if publication.tags else [],
            new_tags=[]
        )
