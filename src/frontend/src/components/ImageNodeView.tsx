'use client'

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { X } from 'lucide-react'
import { useState } from 'react'

export function ImageNodeView({ node, deleteNode, editor }: NodeViewProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isEditable = editor.isEditable

  return (
    <NodeViewWrapper
      className="relative inline-block my-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={node.attrs.src}
        alt={node.attrs.alt || ''}
        title={node.attrs.title || ''}
        className="max-w-full h-auto rounded"
        draggable={false}
      />

      {/* 削除ボタン - 編集モードかつホバー時のみ表示 */}
      {isEditable && isHovered && (
        <button
          type="button"
          onClick={deleteNode}
          className="absolute top-2 right-2 p-1 bg-danger-500 text-white rounded-full shadow-lg hover:bg-danger-600 transition-colors"
          aria-label="画像を削除"
          title="画像を削除"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </NodeViewWrapper>
  )
}
