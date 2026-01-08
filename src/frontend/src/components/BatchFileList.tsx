'use client'

import { FileText, X, Check, AlertCircle, Loader2, Clock, XCircle } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import { useBatchStore } from '@/stores'
import type { QueuedFile } from '@/lib/types'

interface BatchFileListProps {
  className?: string
}

const statusConfig: Record<
  QueuedFile['status'],
  { icon: React.ReactNode; label: string; color: string }
> = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    label: '待機中',
    color: 'text-gray-500',
  },
  uploading: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: 'アップロード中',
    color: 'text-blue-500',
  },
  converting: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: '変換中',
    color: 'text-primary-500',
  },
  completed: {
    icon: <Check className="h-4 w-4" />,
    label: '完了',
    color: 'text-success-600',
  },
  error: {
    icon: <AlertCircle className="h-4 w-4" />,
    label: 'エラー',
    color: 'text-danger-500',
  },
  cancelled: {
    icon: <XCircle className="h-4 w-4" />,
    label: 'キャンセル',
    color: 'text-gray-500',
  },
}

export function BatchFileList({ className }: BatchFileListProps) {
  const { queuedFiles, removeFile, isConverting } = useBatchStore()

  if (queuedFiles.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
        <p>ファイルを追加してください</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
        <span>ファイル一覧</span>
        <span>{queuedFiles.length}件</span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {queuedFiles.map((queuedFile) => {
          const status = statusConfig[queuedFile.status]

          const progress = queuedFile.progress || 0
          const showProgress = queuedFile.status === 'converting' || queuedFile.status === 'uploading'

          return (
            <div
              key={queuedFile.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{queuedFile.file.name}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">{formatFileSize(queuedFile.file.size)}</span>
                      <span className={cn('flex items-center gap-1', status.color)}>
                        {status.icon}
                        <span>{status.label}</span>
                        {showProgress && <span className="ml-1">({progress}%)</span>}
                      </span>
                    </div>
                    {queuedFile.errorMessage && (
                      <p className="text-sm text-danger-500 mt-1">{queuedFile.errorMessage}</p>
                    )}
                  </div>
                </div>

                {!isConverting && queuedFile.status === 'pending' && (
                  <button
                    onClick={() => removeFile(queuedFile.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors ml-2"
                    title="削除"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* 進捗バー */}
              {showProgress && (
                <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
