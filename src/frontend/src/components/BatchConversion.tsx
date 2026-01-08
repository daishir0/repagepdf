'use client'

import { useState } from 'react'
import { Play, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useBatchStore } from '@/stores'

interface BatchConversionProps {
  templateId: number
  className?: string
}

const converterOptions = [
  { value: 'pymupdf', label: 'PyMuPDF (高速)' },
  { value: 'pdfplumber', label: 'pdfplumber (表に強い)' },
  { value: 'openai_vision', label: 'OpenAI Vision (高精度)' },
  { value: 'claude_vision', label: 'Claude Vision (高精度)' },
]

export function BatchConversion({ templateId, className }: BatchConversionProps) {
  const { queuedFiles, isConverting, startBatch, cancelBatch } = useBatchStore()
  const [converterType, setConverterType] = useState('pymupdf')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const handleStartBatch = async () => {
    await startBatch(templateId, converterType)
  }

  const handleCancelClick = () => {
    setShowCancelConfirm(true)
  }

  const handleConfirmCancel = async () => {
    await cancelBatch()
    setShowCancelConfirm(false)
  }

  const canStart = queuedFiles.length > 0 && !isConverting

  return (
    <div className={className}>
      {/* 変換方式選択 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">変換方式</label>
        <select
          value={converterType}
          onChange={(e) => setConverterType(e.target.value)}
          disabled={isConverting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {converterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* ボタン */}
      <div className="flex items-center gap-3">
        {!isConverting ? (
          <Button
            variant="primary"
            size="lg"
            onClick={handleStartBatch}
            disabled={!canStart}
            leftIcon={<Play className="h-5 w-5" />}
            className="flex-1"
          >
            一括変換開始 ({queuedFiles.length}件)
          </Button>
        ) : (
          <Button
            variant="danger"
            size="lg"
            onClick={handleCancelClick}
            leftIcon={<XCircle className="h-5 w-5" />}
            className="flex-1"
          >
            一括キャンセル
          </Button>
        )}
      </div>

      {/* キャンセル確認ダイアログ */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">キャンセルの確認</h3>
            <p className="text-gray-600 mb-6">
              一括変換をキャンセルしますか？処理中のファイルは完了を待ちますが、未処理のファイルはスキップされます。
            </p>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowCancelConfirm(false)}>
                戻る
              </Button>
              <Button variant="danger" onClick={handleConfirmCancel}>
                キャンセルする
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
