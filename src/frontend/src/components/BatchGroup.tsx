'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Download, Trash2, Loader2, FileText, Check, AlertCircle, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn, formatFileSize } from '@/lib/utils'
import { batchApi } from '@/lib/api'
import type { Batch, Conversion } from '@/lib/types'
import toast from 'react-hot-toast'

interface BatchGroupProps {
  batch: Batch
  conversions?: Conversion[]
  onDelete?: (batchId: string) => void
  className?: string
}

export function BatchGroup({ batch, conversions = [], onDelete, className }: BatchGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDownload = async () => {
    if (batch.completed_files === 0) {
      toast.error('ダウンロード可能な完了ファイルがありません')
      return
    }

    setIsDownloading(true)
    try {
      const blob = await batchApi.download(batch.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch_${batch.id.substring(0, 8)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('ダウンロードを開始しました')
    } catch (error) {
      toast.error('ダウンロードに失敗しました')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      await batchApi.delete(batch.id)
      toast.success('バッチを削除しました')
      onDelete?.(batch.id)
    } catch (error) {
      toast.error('削除に失敗しました')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusLabel = {
    pending: '待機中',
    processing: '処理中',
    completed: '完了',
    partial: '一部完了',
    cancelled: 'キャンセル',
  }[batch.status]

  const statusColor = {
    pending: 'text-gray-500 bg-gray-100',
    processing: 'text-blue-600 bg-blue-100',
    completed: 'text-success-600 bg-success-100',
    partial: 'text-warning-600 bg-warning-100',
    cancelled: 'text-gray-500 bg-gray-100',
  }[batch.status]

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">バッチ変換</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColor)}>
                {statusLabel}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-0.5">
              {formatDate(batch.created_at)} - {batch.total_files}件
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* サマリー */}
          <div className="text-sm text-gray-500 mr-4">
            <span className="text-success-600">{batch.completed_files}成功</span>
            {batch.failed_files > 0 && (
              <span className="text-danger-500 ml-2">{batch.failed_files}失敗</span>
            )}
          </div>

          {/* 一括ダウンロード */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleDownload()
            }}
            disabled={batch.completed_files === 0 || isDownloading}
            leftIcon={
              isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )
            }
          >
            一括DL
          </Button>

          {/* 一括削除 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteClick()
            }}
            disabled={isDeleting}
            leftIcon={
              isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )
            }
            className="text-danger-500 hover:text-danger-600 hover:bg-danger-50"
          >
            削除
          </Button>
        </div>
      </div>

      {/* 展開時のファイル一覧 */}
      {isExpanded && conversions.length > 0 && (
        <div className="border-t border-gray-200 divide-y divide-gray-100">
          {conversions.map((conversion) => {
            const isEditable = conversion.status === 'completed' || conversion.status === 'approved'
            const content = (
              <>
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-700 truncate">
                  {conversion.original_filename}
                </span>
                {isEditable ? (
                  <Edit3 className="h-4 w-4 text-primary-500" />
                ) : conversion.status === 'completed' || conversion.status === 'processing' ? (
                  <Check className="h-4 w-4 text-success-600" />
                ) : conversion.status === 'error' || conversion.status === 'failed' ? (
                  <AlertCircle className="h-4 w-4 text-danger-500" />
                ) : (
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                )}
              </>
            )

            if (isEditable) {
              return (
                <Link
                  key={conversion.id}
                  href={`/conversions/${conversion.id}/edit`}
                  className="flex items-center gap-3 px-4 py-3 pl-12 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {content}
                </Link>
              )
            }

            return (
              <div key={conversion.id} className="flex items-center gap-3 px-4 py-3 pl-12">
                {content}
              </div>
            )
          })}
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">削除の確認</h3>
            <p className="text-gray-600 mb-6">
              このバッチと含まれる{batch.total_files}件の変換結果を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                キャンセル
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete} isLoading={isDeleting}>
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
