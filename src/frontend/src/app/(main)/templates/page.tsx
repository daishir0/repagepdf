'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Globe, RefreshCw, Trash2, LayoutTemplate } from 'lucide-react'
import { useTemplateStore } from '@/stores'
import {
  Button,
  Card,
  StatusBadge,
  LoadingCard,
  EmptyState,
  Modal,
  ModalFooter,
  Input,
  ConfirmDialog,
} from '@/components/ui'
import { formatDate } from '@/lib/utils'
import type { TemplateCreate } from '@/lib/types'

export default function TemplatesPage() {
  const {
    templates,
    isLoading,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    relearnTemplate,
  } = useTemplateStore()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // フォーム状態
  const [formData, setFormData] = useState<TemplateCreate>({
    name: '',
    url1: '',
    url2: '',
    url3: '',
  })

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // ポーリング（学習中のテンプレートがある場合）
  useEffect(() => {
    const hasLearning = templates.some((t) => t.status === 'learning' || t.status === 'pending')
    if (!hasLearning) return

    const interval = setInterval(() => {
      fetchTemplates()
    }, 5000)

    return () => clearInterval(interval)
  }, [templates, fetchTemplates])

  const handleCreate = async () => {
    if (!formData.name || !formData.url1) return

    setIsSubmitting(true)
    try {
      await createTemplate(formData)
      setIsCreateModalOpen(false)
      setFormData({ name: '', url1: '', url2: '', url3: '' })
    } catch {
      // エラーはストアでハンドリング
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTemplateId) return

    setIsSubmitting(true)
    try {
      await deleteTemplate(selectedTemplateId)
      setIsDeleteDialogOpen(false)
      setSelectedTemplateId(null)
    } catch {
      // エラーはストアでハンドリング
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRelearn = async (id: number) => {
    try {
      await relearnTemplate(id)
    } catch {
      // エラーはストアでハンドリング
    }
  }

  const openDeleteDialog = (id: number) => {
    setSelectedTemplateId(id)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">テンプレート</h1>
          <p className="text-gray-600 mt-1">サイトのコーディングルールを学習したテンプレート</p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          新規作成
        </Button>
      </div>

      {/* テンプレート一覧 */}
      {isLoading && templates.length === 0 ? (
        <LoadingCard message="テンプレートを読み込み中..." />
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={<LayoutTemplate className="h-12 w-12" />}
            title="テンプレートがありません"
            description="サイトURLを登録して、コーディングルールを学習させましょう"
            action={
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                テンプレートを作成
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} padding="none" className="overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      href={`/templates/${template.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-primary-600 truncate"
                    >
                      {template.name}
                    </Link>
                    <StatusBadge status={template.status} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Globe className="h-4 w-4" />
                    <a
                      href={template.url1}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary-600 truncate"
                    >
                      {template.url1}
                    </a>
                    {template.url2 && (
                      <span className="text-gray-400">+{template.url3 ? 2 : 1}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    作成: {formatDate(template.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {template.status === 'ready' && (
                    <Link href={`/templates/${template.id}`}>
                      <Button variant="outline" size="sm">
                        変換する
                      </Button>
                    </Link>
                  )}
                  {(template.status === 'ready' || template.status === 'failed') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRelearn(template.id)}
                      title="再学習"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(template.id)}
                    className="text-danger-500 hover:text-danger-600 hover:bg-danger-50"
                    title="削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {template.error_message && (
                <div className="px-4 pb-4">
                  <div className="p-3 bg-danger-50 rounded-lg text-sm text-danger-700">
                    {template.error_message}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 作成モーダル */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="テンプレートを作成"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="テンプレート名"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例: 〇〇市ホームページ"
          />
          <Input
            label="参照サイトURL 1（必須）"
            value={formData.url1}
            onChange={(e) => setFormData({ ...formData, url1: e.target.value })}
            placeholder="https://example.com/page1"
            helperText="HTMLのコーディングルールを学習するページのURL"
          />
          <Input
            label="参照サイトURL 2（任意）"
            value={formData.url2 || ''}
            onChange={(e) => setFormData({ ...formData, url2: e.target.value })}
            placeholder="https://example.com/page2"
            helperText="追加の学習用ページURL"
          />
          <Input
            label="参照サイトURL 3（任意）"
            value={formData.url3 || ''}
            onChange={(e) => setFormData({ ...formData, url3: e.target.value })}
            placeholder="https://example.com/page3"
            helperText="追加の学習用ページURL"
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleCreate}
            isLoading={isSubmitting}
            disabled={!formData.name || !formData.url1}
          >
            作成して学習開始
          </Button>
        </ModalFooter>
      </Modal>

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="テンプレートを削除"
        message="このテンプレートと関連する変換履歴がすべて削除されます。この操作は取り消せません。"
        confirmLabel="削除する"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  )
}
