'use client'

import { useState, useCallback, useRef, useEffect, ReactNode } from 'react'

interface SideBySideLayoutProps {
  leftPane: ReactNode
  rightPane: ReactNode
  initialLeftWidth?: number // パーセンテージ (0-100)
  minWidth?: number // 最小幅パーセンテージ
}

export function SideBySideLayout({
  leftPane,
  rightPane,
  initialLeftWidth = 50,
  minWidth = 20,
}: SideBySideLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100

      // 最小幅制約を適用
      if (newLeftWidth >= minWidth && newLeftWidth <= 100 - minWidth) {
        setLeftWidth(newLeftWidth)
      }
    },
    [isDragging, minWidth]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {/* 左ペイン */}
      <div
        className="h-full overflow-auto"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPane}
      </div>

      {/* リサイザー */}
      <div
        className={`w-1 cursor-col-resize bg-gray-200 hover:bg-primary-400 transition-colors flex-shrink-0 ${
          isDragging ? 'bg-primary-500' : ''
        }`}
        onMouseDown={handleMouseDown}
      />

      {/* 右ペイン */}
      <div
        className="h-full overflow-auto flex-1"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightPane}
      </div>
    </div>
  )
}
