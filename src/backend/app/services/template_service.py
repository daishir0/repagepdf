"""
テンプレートサービス
テンプレートのCRUD操作
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models import Template
from app.schemas import TemplateCreate, TemplateUpdate
from app.core.exceptions import TemplateNotFoundException, TemplateHasConversionsException


class TemplateService:
    """テンプレートサービスクラス"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int, data: TemplateCreate) -> Template:
        """テンプレートを作成"""
        template = Template(
            user_id=user_id,
            name=data.name,
            url1=data.url1,
            url2=data.url2,
            url3=data.url3,
            status=Template.STATUS_PENDING
        )
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    def get_by_id(self, template_id: int, user_id: int) -> Template:
        """IDでテンプレートを取得"""
        template = self.db.query(Template).filter(
            Template.id == template_id,
            Template.user_id == user_id
        ).first()

        if not template:
            raise TemplateNotFoundException(template_id)

        return template

    def get_list(
        self,
        user_id: int,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> tuple[List[Template], int]:
        """テンプレート一覧を取得"""
        query = self.db.query(Template).filter(Template.user_id == user_id)

        if status:
            query = query.filter(Template.status == status)

        # 総件数
        total = query.count()

        # ページネーション
        templates = query.order_by(Template.created_at.desc()) \
            .offset((page - 1) * limit) \
            .limit(limit) \
            .all()

        return templates, total

    def update(self, template_id: int, user_id: int, data: TemplateUpdate) -> Template:
        """テンプレートを更新"""
        template = self.get_by_id(template_id, user_id)

        if data.name is not None:
            template.name = data.name
        if data.url1 is not None:
            template.url1 = data.url1
        if data.url2 is not None:
            template.url2 = data.url2
        if data.url3 is not None:
            template.url3 = data.url3

        self.db.commit()
        self.db.refresh(template)
        return template

    def delete(self, template_id: int, user_id: int) -> bool:
        """テンプレートを削除"""
        template = self.get_by_id(template_id, user_id)

        # 関連する変換データがある場合はエラー
        if template.conversions:
            raise TemplateHasConversionsException()

        self.db.delete(template)
        self.db.commit()
        return True

    def set_learning_status(self, template: Template):
        """学習中ステータスに更新"""
        template.status = Template.STATUS_LEARNING
        template.error_message = None
        self.db.commit()

    def set_ready_status(self, template: Template, learned_rules: str):
        """学習完了ステータスに更新"""
        template.status = Template.STATUS_READY
        template.learned_rules = learned_rules
        template.error_message = None
        self.db.commit()

    def set_error_status(self, template: Template, error_message: str):
        """エラーステータスに更新"""
        template.status = Template.STATUS_ERROR
        template.error_message = error_message
        self.db.commit()

    def get_ready_templates(self, user_id: int) -> List[Template]:
        """学習完了済みテンプレート一覧を取得"""
        return self.db.query(Template).filter(
            Template.user_id == user_id,
            Template.status == Template.STATUS_READY
        ).order_by(Template.name).all()
