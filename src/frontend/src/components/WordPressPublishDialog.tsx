'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Check, AlertCircle, Tag, Folder, Plus, X } from 'lucide-react'
import { useWordPressStore, useSettingsStore } from '@/stores'
import { Button, Modal, Input, Select, Badge, Spinner } from '@/components/ui'
import type { WPPublishRequest } from '@/lib/types'

interface WordPressPublishDialogProps {
  isOpen: boolean
  onClose: () => void
  conversionId: number
  defaultTitle?: string
}

export function WordPressPublishDialog({
  isOpen,
  onClose,
  conversionId,
  defaultTitle = '',
}: WordPressPublishDialogProps) {
  const { settings } = useSettingsStore()
  const {
    categories,
    tags,
    isLoadingCategories,
    isLoadingTags,
    isPublishing,
    publishResult,
    fetchCategories,
    fetchTags,
    publish,
    clearPublishResult,
  } = useWordPressStore()

  // フォーム状態
  const [title, setTitle] = useState(defaultTitle)
  const [status, setStatus] = useState<'draft' | 'publish'>('draft')
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [newTagInput, setNewTagInput] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])

  // 初期化
  useEffect(() => {
    if (isOpen && settings?.wordpress_config?.is_configured) {
      fetchCategories()
      fetchTags()
      setTitle(defaultTitle)
      setStatus('draft')
      setSelectedCategories([])
      setSelectedTags([])
      setNewTags([])
      clearPublishResult()
    }
  }, [isOpen, settings?.wordpress_config?.is_configured, fetchCategories, fetchTags, defaultTitle, clearPublishResult])

  const handleAddNewTag = () => {
    const trimmed = newTagInput.trim()
    if (trimmed && !newTags.includes(trimmed)) {
      setNewTags([...newTags, trimmed])
      setNewTagInput('')
    }
  }

  const handleRemoveNewTag = (tag: string) => {
    setNewTags(newTags.filter((t) => t !== tag))
  }

  const handleCategoryToggle = (categoryId: number) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId))
    } else {
      setSelectedCategories([...selectedCategories, categoryId])
    }
  }

  const handleTagToggle = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((id) => id !== tagId))
    } else {
      setSelectedTags([...selectedTags, tagId])
    }
  }

  const handlePublish = async () => {
    if (!title.trim()) {
      return
    }

    const request: WPPublishRequest = {
      conversion_id: conversionId,
      title: title.trim(),
      status,
      category_ids: selectedCategories,
      tag_ids: selectedTags,
      new_tags: newTags,
    }

    await publish(request)
  }

  const handleClose = () => {
    clearPublishResult()
    onClose()
  }

  // WordPress未設定の場合
  if (!settings?.wordpress_config?.is_configured) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="WordPress公開">
        <div className="text-center py-6">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">WordPress連携が設定されていません</h3>
          <p className="text-gray-600 mb-4">
            WordPressに公開するには、設定画面でWordPress連携を設定してください。
          </p>
          <Button onClick={handleClose}>閉じる</Button>
        </div>
      </Modal>
    )
  }

  // 公開成功の場合
  if (publishResult?.success) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="公開完了">
        <div className="text-center py-6">
          <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">WordPressへの公開が完了しました</h3>
          <div className="space-y-3 mt-4">
            {publishResult.post_url && (
              <a
                href={publishResult.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary-600 hover:underline"
              >
                投稿を確認
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {publishResult.admin_url && (
              <div>
                <a
                  href={publishResult.admin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-gray-600 hover:underline text-sm"
                >
                  管理画面で編集
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
          <div className="mt-6">
            <Button onClick={handleClose}>閉じる</Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="WordPressに公開" size="lg">
      <div className="space-y-6">
        {/* 公開失敗メッセージ */}
        {publishResult && !publishResult.success && (
          <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm border border-red-200">
            <p className="font-medium">公開に失敗しました</p>
            <p>{publishResult.error_message}</p>
          </div>
        )}

        {/* タイトル */}
        <Input
          label="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="投稿タイトルを入力"
          required
        />

        {/* 公開ステータス */}
        <Select
          label="公開ステータス"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'draft' | 'publish')}
          options={[
            { value: 'draft', label: '下書き' },
            { value: 'publish', label: '公開' },
          ]}
        />

        {/* カテゴリ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Folder className="h-4 w-4 inline mr-1" />
            カテゴリ
          </label>
          {isLoadingCategories ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Spinner size="sm" />
              <span>読み込み中...</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
              {categories.length === 0 ? (
                <span className="text-gray-500 text-sm">カテゴリがありません</span>
              ) : (
                categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryToggle(category.id)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedCategories.includes(category.id)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                    {selectedCategories.includes(category.id) && (
                      <Check className="h-3 w-3 inline ml-1" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* タグ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Tag className="h-4 w-4 inline mr-1" />
            タグ
          </label>
          {isLoadingTags ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Spinner size="sm" />
              <span>読み込み中...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 既存タグ */}
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
                {tags.length === 0 ? (
                  <span className="text-gray-500 text-sm">タグがありません</span>
                ) : (
                  tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedTags.includes(tag.id)
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag.name}
                      {selectedTags.includes(tag.id) && <Check className="h-3 w-3 inline ml-1" />}
                    </button>
                  ))
                )}
              </div>

              {/* 新規タグ入力 */}
              <div className="flex gap-2">
                <Input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="新しいタグを追加"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddNewTag()
                    }
                  }}
                />
                <Button variant="outline" onClick={handleAddNewTag} disabled={!newTagInput.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* 新規タグ一覧 */}
              {newTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newTags.map((tag) => (
                    <Badge key={tag} variant="primary">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveNewTag(tag)}
                        className="ml-1 hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={handleClose} disabled={isPublishing}>
            キャンセル
          </Button>
          <Button onClick={handlePublish} isLoading={isPublishing} disabled={!title.trim()}>
            {status === 'draft' ? '下書き保存' : '公開する'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
