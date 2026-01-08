'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { CustomImage } from './CustomImageExtension'
import { useEffect, useCallback, useRef, useState } from 'react'

interface TiptapEditorProps {
  initialContent: string
  editable: boolean
  onUpdate: (html: string) => void
  onDirtyChange: (isDirty: boolean) => void
  onEditorReady?: (editor: Editor) => void
}

// サポートする画像形式
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export function TiptapEditor({
  initialContent,
  editable,
  onUpdate,
  onDirtyChange,
  onEditorReady,
}: TiptapEditorProps) {
  const initialContentRef = useRef(initialContent)
  const hasInitialized = useRef(false)

  const [imageError, setImageError] = useState<string | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      CustomImage.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onUpdate(html)

      // 初期コンテンツと比較してdirty状態を判定
      const isDirty = html !== initialContentRef.current
      onDirtyChange(isDirty)
    },
  })

  // エディタ準備完了時のコールバック
  useEffect(() => {
    if (editor && !hasInitialized.current) {
      hasInitialized.current = true
      onEditorReady?.(editor)
    }
  }, [editor, onEditorReady])

  // editable状態の更新
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  // 画像ファイルをBase64に変換してエディタに挿入
  const insertImage = useCallback(
    (file: File) => {
      if (!editor) return

      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        setImageError(`サポートされていない画像形式です: ${file.type.split('/')[1] || '不明'}`)
        setTimeout(() => setImageError(null), 3000)
        return false
      }
      setImageError(null)

      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        editor.chain().focus().setImage({ src: base64 }).run()
      }
      reader.readAsDataURL(file)
      return true
    },
    [editor]
  )

  // ドラッグ&ドロップ処理
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      if (!editable) return

      const files = event.dataTransfer.files
      if (files.length === 0) return

      const file = files[0]
      if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        event.preventDefault()
        insertImage(file)
      }
    },
    [editable, insertImage]
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      if (!editable) return
      event.preventDefault()
    },
    [editable]
  )

  // ペースト処理
  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      if (!editable || !editor) return

      const items = event.clipboardData.items
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) {
            insertImage(file)
          }
          return
        }
      }
      // テキストの場合は通常のペースト動作
    },
    [editable, editor, insertImage]
  )

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">エディタを読み込み中...</p>
      </div>
    )
  }

  return (
    <div
      className="h-full overflow-auto relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onPaste={handlePaste}
    >
      {/* エラーメッセージ表示 */}
      {imageError && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-danger-500 text-white text-sm rounded shadow-lg">
          {imageError}
        </div>
      )}
      <EditorContent
        editor={editor}
        className={`prose prose-sm max-w-none h-full p-4 ${
          editable ? 'focus-within:outline-none' : ''
        }`}
      />
    </div>
  )
}

export type { TiptapEditorProps }
