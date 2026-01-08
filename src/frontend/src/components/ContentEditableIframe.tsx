'use client'

import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react'

interface ContentEditableIframeProps {
  content: string
  editable: boolean
  onUpdate: (html: string) => void
  onSelectionChange?: (count: number) => void
  className?: string
}

// サポートする画像形式
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export interface ContentEditableIframeRef {
  selectAllImages: () => void
  deleteSelectedImages: () => void
  clearSelection: () => void
}

export const ContentEditableIframe = forwardRef<ContentEditableIframeRef, ContentEditableIframeProps>(function ContentEditableIframe({
  content,
  editable,
  onUpdate,
  onSelectionChange,
  className = '',
}, ref) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const contentRef = useRef(content)
  const selectedImagesRef = useRef<Set<HTMLImageElement>>(new Set())

  // 選択状態を更新
  const updateSelectionCount = useCallback(() => {
    onSelectionChange?.(selectedImagesRef.current.size)
  }, [onSelectionChange])

  // 画像の選択状態を視覚的に更新
  const updateImageVisualState = useCallback((img: HTMLImageElement, selected: boolean) => {
    if (selected) {
      img.style.outline = '3px solid #3b82f6'
      img.style.outlineOffset = '2px'
    } else {
      img.style.outline = ''
      img.style.outlineOffset = ''
    }
  }, [])

  // 全画像を選択
  const selectAllImages = useCallback(() => {
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!doc) return

    const images = doc.querySelectorAll('img')
    selectedImagesRef.current.clear()
    images.forEach((img) => {
      selectedImagesRef.current.add(img as HTMLImageElement)
      updateImageVisualState(img as HTMLImageElement, true)
    })
    updateSelectionCount()
  }, [updateImageVisualState, updateSelectionCount])

  // 選択画像を削除
  const deleteSelectedImages = useCallback(() => {
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!doc || selectedImagesRef.current.size === 0) return

    selectedImagesRef.current.forEach((img) => {
      img.remove()
    })
    selectedImagesRef.current.clear()
    updateSelectionCount()
    onUpdate(doc.body.innerHTML)
  }, [onUpdate, updateSelectionCount])

  // 選択をクリア
  const clearSelection = useCallback(() => {
    selectedImagesRef.current.forEach((img) => {
      updateImageVisualState(img, false)
    })
    selectedImagesRef.current.clear()
    updateSelectionCount()
  }, [updateImageVisualState, updateSelectionCount])

  // refに関数を公開
  useImperativeHandle(ref, () => ({
    selectAllImages,
    deleteSelectedImages,
    clearSelection,
  }), [selectAllImages, deleteSelectedImages, clearSelection])

  // 画像をBase64に変換してiframe内に挿入
  const insertImageToIframe = useCallback((file: File) => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument) return false

    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      setImageError(`サポートされていない画像形式です: ${file.type.split('/')[1] || '不明'}`)
      setTimeout(() => setImageError(null), 3000)
      return false
    }
    setImageError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      const doc = iframe.contentDocument
      if (!doc) return

      // 画像要素を作成
      const img = doc.createElement('img')
      img.src = base64
      img.style.maxWidth = '100%'
      img.style.height = 'auto'

      // 現在の選択位置に挿入
      const selection = doc.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(img)
        // カーソルを画像の後ろに移動
        range.setStartAfter(img)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      } else {
        // 選択がない場合は末尾に追加
        doc.body.appendChild(img)
      }

      // 変更を通知
      onUpdate(doc.body.innerHTML)
    }
    reader.readAsDataURL(file)
    return true
  }, [onUpdate])

  // iframeの初期化とイベント設定
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const setupIframe = () => {
      const doc = iframe.contentDocument
      if (!doc) return

      // HTMLを設定
      doc.open()
      doc.write(content)
      doc.close()

      // contentEditableを設定
      if (editable) {
        doc.body.contentEditable = 'true'
        doc.body.style.outline = 'none'
        doc.body.style.minHeight = '100%'

        // 入力イベントで変更を通知
        const handleInput = () => {
          onUpdate(doc.body.innerHTML)
        }
        doc.body.addEventListener('input', handleInput)

        // ドラッグ&ドロップ処理
        const handleDragOver = (e: DragEvent) => {
          e.preventDefault()
          e.stopPropagation()
        }

        const handleDrop = (e: DragEvent) => {
          e.preventDefault()
          e.stopPropagation()
          const files = e.dataTransfer?.files
          if (files && files.length > 0) {
            const file = files[0]
            if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
              insertImageToIframe(file)
            }
          }
        }

        doc.body.addEventListener('dragover', handleDragOver)
        doc.body.addEventListener('drop', handleDrop)

        // ペースト処理
        const handlePaste = (e: ClipboardEvent) => {
          const items = e.clipboardData?.items
          if (!items) return

          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (item.type.startsWith('image/')) {
              e.preventDefault()
              const file = item.getAsFile()
              if (file) {
                insertImageToIframe(file)
              }
              return
            }
          }
          // テキストの場合は通常のペースト動作
        }

        doc.body.addEventListener('paste', handlePaste)

        // 画像クリック時の選択処理（Ctrl+クリックで複数選択）
        const handleClick = (e: MouseEvent) => {
          const target = e.target as HTMLElement

          if (target.tagName === 'IMG') {
            const img = target as HTMLImageElement
            const isCtrlOrCmd = e.ctrlKey || e.metaKey

            if (isCtrlOrCmd) {
              // Ctrl+クリック: 選択をトグル
              if (selectedImagesRef.current.has(img)) {
                selectedImagesRef.current.delete(img)
                updateImageVisualState(img, false)
              } else {
                selectedImagesRef.current.add(img)
                updateImageVisualState(img, true)
              }
            } else {
              // 通常クリック: 選択をリセットして1つだけ選択
              selectedImagesRef.current.forEach((prevImg) => {
                updateImageVisualState(prevImg, false)
              })
              selectedImagesRef.current.clear()
              selectedImagesRef.current.add(img)
              updateImageVisualState(img, true)
            }
            updateSelectionCount()
          } else {
            // 画像以外をクリックしたら選択解除
            if (!e.ctrlKey && !e.metaKey) {
              selectedImagesRef.current.forEach((img) => {
                updateImageVisualState(img, false)
              })
              selectedImagesRef.current.clear()
              updateSelectionCount()
            }
          }
        }

        doc.body.addEventListener('click', handleClick)

        // キーボード処理（Delete/Backspaceで画像削除、Ctrl+Aで全選択）
        const handleKeyDown = (e: KeyboardEvent) => {
          // Ctrl+A: 全画像選択
          if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault()
            selectAllImages()
            return
          }

          // Delete/Backspace: 選択画像を削除
          if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImagesRef.current.size > 0) {
            e.preventDefault()
            e.stopPropagation()
            deleteSelectedImages()
            return
          }

          // 画像選択中に他のキーが押されたら選択解除（入力文字の場合）
          if (selectedImagesRef.current.size > 0 && !e.ctrlKey && !e.metaKey && e.key.length === 1) {
            selectedImagesRef.current.forEach((img) => {
              updateImageVisualState(img, false)
            })
            selectedImagesRef.current.clear()
            updateSelectionCount()
          }
        }

        doc.body.addEventListener('keydown', handleKeyDown)

        // クリーンアップ
        return () => {
          doc.body.removeEventListener('input', handleInput)
          doc.body.removeEventListener('dragover', handleDragOver)
          doc.body.removeEventListener('drop', handleDrop)
          doc.body.removeEventListener('paste', handlePaste)
          doc.body.removeEventListener('click', handleClick)
          doc.body.removeEventListener('keydown', handleKeyDown)
        }
      } else {
        doc.body.contentEditable = 'false'
      }
    }

    // iframeのloadイベントを待つ
    iframe.addEventListener('load', setupIframe)
    // 初回も実行（既にロード済みの場合）
    if (iframe.contentDocument?.readyState === 'complete') {
      setupIframe()
    }

    return () => {
      iframe.removeEventListener('load', setupIframe)
    }
  }, [content, editable, onUpdate, insertImageToIframe, selectAllImages, deleteSelectedImages, updateImageVisualState, updateSelectionCount])

  // contentが変更された場合のみ更新（外部からの更新）
  useEffect(() => {
    if (content !== contentRef.current) {
      contentRef.current = content
      const iframe = iframeRef.current
      const doc = iframe?.contentDocument
      if (doc && doc.body.innerHTML !== content) {
        // 外部から更新された場合のみ反映
        doc.body.innerHTML = content
      }
    }
  }, [content])

  return (
    <div className={`relative h-full ${className}`}>
      {/* エラーメッセージ表示 */}
      {imageError && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-red-500 text-white text-sm rounded shadow-lg">
          {imageError}
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={content}
        className="w-full h-full border-0 bg-white"
        title="HTML編集"
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  )
})
