'use client'

import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBatchStore } from '@/stores'

interface BatchProgressProps {
  className?: string
}

export function BatchProgress({ className }: BatchProgressProps) {
  const { currentBatch, isConverting, queuedFiles } = useBatchStore()

  if (!isConverting && !currentBatch) {
    return null
  }

  const total = currentBatch?.total_files ?? queuedFiles.length
  const completed = currentBatch?.completed_files ?? 0
  const failed = currentBatch?.failed_files ?? 0
  const processed = completed + failed
  const progressPercent = total > 0 ? Math.round((processed / total) * 100) : 0
  const isCompleted = currentBatch?.status === 'completed' || currentBatch?.status === 'partial'

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-4', className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">
          {isCompleted ? '変換完了' : '変換中...'}
        </span>
        <span className="text-sm text-gray-500">
          {completed} / {total} 完了
          {failed > 0 && <span className="text-danger-500 ml-1">({failed}件エラー)</span>}
        </span>
      </div>

      {/* プログレスバー */}
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
            failed > 0 ? 'bg-warning-500' : 'bg-primary-500'
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* パーセンテージ */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">{progressPercent}%</span>
        {isCompleted && (
          <span className="flex items-center gap-1 text-xs text-success-600">
            <CheckCircle className="h-3 w-3" />
            完了
          </span>
        )}
      </div>
    </div>
  )
}
