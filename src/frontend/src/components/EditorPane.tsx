'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { ContentEditableIframe, ContentEditableIframeRef } from './ContentEditableIframe'
import { Button } from '@/components/ui/Button'
import { Save, Eye, Edit, Image, Trash2 } from 'lucide-react'

interface EditorPaneProps {
  initialContent: string
  onSave: (html: string) => Promise<void>
  className?: string
}

export function EditorPane({
  initialContent,
  onSave,
  className = '',
}: EditorPaneProps) {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentContent, setCurrentContent] = useState(initialContent)
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [selectedImageCount, setSelectedImageCount] = useState(0)
  const initialContentRef = useRef(initialContent)
  const editorRef = useRef<ContentEditableIframeRef>(null)

  const handleUpdate = useCallback((html: string) => {
    setCurrentContent(html)
    // 初期コンテンツと比較してdirty状態を判定
    const isDirtyNow = html !== initialContentRef.current
    setIsDirty(isDirtyNow)
  }, [])

  const handleModeChange = useCallback((newMode: 'preview' | 'edit') => {
    setMode(newMode)
    // モード切替時に選択をクリア
    setSelectedImageCount(0)
  }, [])

  const handleSelectionChange = useCallback((count: number) => {
    setSelectedImageCount(count)
  }, [])

  const handleSelectAllImages = useCallback(() => {
    editorRef.current?.selectAllImages()
  }, [])

  const handleDeleteSelectedImages = useCallback(() => {
    editorRef.current?.deleteSelectedImages()
  }, [])

  // ページ離脱時の警告（未保存の変更がある場合）
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      await onSave(currentContent)
      // 保存成功後、初期コンテンツを更新
      initialContentRef.current = currentContent
      setIsDirty(false)
      setSaveMessage({ type: 'success', text: '保存しました' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Save error:', error)
      setSaveMessage({
        type: 'error',
        text: '保存に失敗しました。再度お試しください。',
      })
    } finally {
      setIsSaving(false)
    }
  }, [currentContent, onSave])

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* ツールバー */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        {/* モード切り替え */}
        <div className="flex items-center gap-2">
          <Button
            variant={mode === 'preview' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => handleModeChange('preview')}
            leftIcon={<Eye className="h-4 w-4" />}
          >
            プレビュー
          </Button>
          <Button
            variant={mode === 'edit' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => handleModeChange('edit')}
            leftIcon={<Edit className="h-4 w-4" />}
          >
            編集
          </Button>
        </div>

        {/* 編集モード時の画像操作 */}
        {mode === 'edit' && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAllImages}
              leftIcon={<Image className="h-4 w-4" />}
            >
              全画像選択
            </Button>
            {selectedImageCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteSelectedImages}
                leftIcon={<Trash2 className="h-4 w-4" />}
                className="text-danger-500 hover:text-danger-600 hover:bg-danger-50"
              >
                {selectedImageCount}件削除
              </Button>
            )}
          </div>
        )}

        {/* 未保存インジケータ */}
        {isDirty && (
          <span className="text-sm text-warning-600">未保存の変更があります</span>
        )}
      </div>

      {/* 保存ボタンと状態表示 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div>
          {saveMessage && (
            <span
              className={`text-sm ${
                saveMessage.type === 'success'
                  ? 'text-success-600'
                  : 'text-danger-500'
              }`}
            >
              {saveMessage.text}
            </span>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          isLoading={isSaving}
          disabled={!isDirty || isSaving}
          leftIcon={<Save className="h-4 w-4" />}
        >
          保存
        </Button>
      </div>

      {/* エディタ本体 */}
      <div className="flex-1 overflow-hidden">
        {mode === 'preview' ? (
          /* プレビューモード: iframeでHTMLを完全にレンダリング（読み取り専用） */
          <iframe
            srcDoc={currentContent}
            className="w-full h-full border-0 bg-white"
            title="HTMLプレビュー"
            sandbox="allow-same-origin"
          />
        ) : (
          /* 編集モード: contentEditable iframeで編集可能 */
          <ContentEditableIframe
            ref={editorRef}
            content={currentContent}
            editable={true}
            onUpdate={handleUpdate}
            onSelectionChange={handleSelectionChange}
          />
        )}
      </div>
    </div>
  )
}
