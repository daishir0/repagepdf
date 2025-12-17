"""
ファイルストレージ管理
PDF、画像、出力ファイルの保存・取得・削除
"""
import os
import shutil
from pathlib import Path
from typing import Optional, List
import zipfile
import io

from app.core.config import settings


class FileStorage:
    """ファイルストレージクラス"""

    def __init__(self, base_path: Optional[str] = None):
        self.base_path = Path(base_path or settings.STORAGE_PATH)
        self.uploads_path = self.base_path / "uploads"
        self.images_path = self.base_path / "images"
        self.outputs_path = self.base_path / "outputs"

        # ディレクトリ作成
        self._ensure_directories()

    def _ensure_directories(self):
        """必要なディレクトリを作成"""
        for path in [self.uploads_path, self.images_path, self.outputs_path]:
            path.mkdir(parents=True, exist_ok=True)

    def save_pdf(self, conversion_id: int, filename: str, content: bytes) -> str:
        """PDFを保存"""
        dir_path = self.uploads_path / str(conversion_id)
        dir_path.mkdir(parents=True, exist_ok=True)

        file_path = dir_path / filename
        file_path.write_bytes(content)

        return str(file_path.relative_to(self.base_path))

    def save_image(self, conversion_id: int, filename: str, content: bytes) -> str:
        """画像を保存"""
        dir_path = self.images_path / str(conversion_id)
        dir_path.mkdir(parents=True, exist_ok=True)

        file_path = dir_path / filename
        file_path.write_bytes(content)

        return str(file_path.relative_to(self.base_path))

    def get_file(self, relative_path: str) -> Optional[bytes]:
        """ファイルを取得"""
        file_path = self.base_path / relative_path
        if file_path.exists():
            return file_path.read_bytes()
        return None

    def get_file_path(self, relative_path: str) -> Optional[Path]:
        """ファイルの絶対パスを取得"""
        file_path = self.base_path / relative_path
        if file_path.exists():
            return file_path
        return None

    def get_pdf_path(self, conversion_id: int, filename: str) -> Optional[Path]:
        """PDFファイルのパスを取得"""
        file_path = self.uploads_path / str(conversion_id) / filename
        if file_path.exists():
            return file_path
        return None

    def list_images(self, conversion_id: int) -> List[Path]:
        """変換に関連する画像一覧を取得"""
        dir_path = self.images_path / str(conversion_id)
        if not dir_path.exists():
            return []
        return list(dir_path.glob("*"))

    def create_images_zip(self, conversion_id: int) -> Optional[bytes]:
        """画像をZIPファイルにまとめる"""
        images = self.list_images(conversion_id)
        if not images:
            return None

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for image_path in images:
                zip_file.write(image_path, image_path.name)

        zip_buffer.seek(0)
        return zip_buffer.read()

    def delete_conversion_files(self, conversion_id: int):
        """変換に関連する全ファイルを削除"""
        for base_path in [self.uploads_path, self.images_path]:
            dir_path = base_path / str(conversion_id)
            if dir_path.exists():
                shutil.rmtree(dir_path)

    def get_file_size(self, relative_path: str) -> int:
        """ファイルサイズを取得"""
        file_path = self.base_path / relative_path
        if file_path.exists():
            return file_path.stat().st_size
        return 0

    def file_exists(self, relative_path: str) -> bool:
        """ファイルの存在確認"""
        file_path = self.base_path / relative_path
        return file_path.exists()


# シングルトンインスタンス
file_storage = FileStorage()
