'use client'

import { Editor } from '@tiptap/react'
import { Bold, Italic, Underline, Edit, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface EditorToolbarProps {
  editor: Editor | null
  mode: 'preview' | 'edit'
  onModeChange: (mode: 'preview' | 'edit') => void
  isDirty: boolean
}

export function EditorToolbar({
  editor,
  mode,
  onModeChange,
  isDirty,
}: EditorToolbarProps) {
  const isEditing = mode === 'edit'

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2 bg-white border-b border-gray-200">
      {/* 左側：書式設定ボタン */}
      <div className="flex items-center gap-1">
        {isEditing && editor && (
          <>
            <Button
              variant={editor.isActive('bold') ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              aria-label="太字"
              title="太字 (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('italic') ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              aria-label="斜体"
              title="斜体 (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('strike') ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              disabled={!editor.can().chain().focus().toggleStrike().run()}
              aria-label="取り消し線"
              title="取り消し線"
            >
              <Underline className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* 編集中インジケータ */}
        {isEditing && isDirty && (
          <span className="ml-4 text-xs text-warning-600 font-medium">
            ● 未保存の変更があります
          </span>
        )}
      </div>

      {/* 右側：モード切り替え */}
      <div className="flex items-center gap-2">
        <Button
          variant={mode === 'preview' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('preview')}
          aria-label="プレビューモード"
        >
          <Eye className="h-4 w-4 mr-1" />
          プレビュー
        </Button>
        <Button
          variant={mode === 'edit' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('edit')}
          aria-label="編集モード"
        >
          <Edit className="h-4 w-4 mr-1" />
          編集
        </Button>
      </div>
    </div>
  )
}
