'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { FileText, Download, Trash2, Eye, Filter, FileOutput, RefreshCw } from 'lucide-react'
import { useConversionStore, useTemplateStore } from '@/stores'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  StatusBadge,
  LoadingCard,
  EmptyState,
  Select,
  ConfirmDialog,
} from '@/components/ui'
import { formatDate, getConverterLabel } from '@/lib/utils'
import { conversionApi } from '@/lib/api'

export default function ConversionsPage() {
  const {
    conversions,
    isLoading,
    fetchConversions,
    deleteConversion,
    refreshConversion,
    filterTemplateId,
    setFilterTemplate,
  } = useConversionStore()
  const { templates, fetchTemplates } = useTemplateStore()

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedConversionId, setSelectedConversionId] = useState<number | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  useEffect(() => {
    fetchConversions()
    fetchTemplates()
  }, [fetchConversions, fetchTemplates])

  // ポーリング（処理中の変換がある場合）
  useEffect(() => {
    const hasProcessing = conversions.some(
      (c) => c.status === 'pending' || c.status === 'processing'
    )
    if (!hasProcessing) return

    const interval = setInterval(() => {
      conversions
        .filter((c) => c.status === 'pending' || c.status === 'processing')
        .forEach((c) => refreshConversion(c.id))
    }, 3000)

    return () => clearInterval(interval)
  }, [conversions, refreshConversion])

  const handleDelete = async () => {
    if (!selectedConversionId) return

    try {
      await deleteConversion(selectedConversionId)
      setIsDeleteDialogOpen(false)
      setSelectedConversionId(null)
    } catch {
      // エラーはストアでハンドリング
    }
  }

  const handlePreview = async (conversionId: number) => {
    try {
      const html = await conversionApi.getHtml(conversionId)
      setPreviewHtml(html)
      setIsPreviewOpen(true)
    } catch {
      // エラーハンドリング
    }
  }

  const handleDownload = async (conversionId: number, filename: string) => {
    try {
      const blob = await conversionApi.downloadHtml(conversionId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename.replace('.pdf', '.html')
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      // エラーハンドリング
    }
  }

  const templateOptions = [
    { value: '', label: 'すべてのテンプレート' },
    ...templates.map((t) => ({ value: t.id.toString(), label: t.name })),
  ]

  const getTemplateName = (templateId: number) => {
    const template = templates.find((t) => t.id === templateId)
    return template?.name || '不明'
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">変換履歴</h1>
          <p className="text-gray-600 mt-1">PDFからHTMLへの変換履歴</p>
        </div>
      </div>

      {/* フィルター */}
      <Card className="mb-6">
        <div className="p-4 flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="w-64">
            <Select
              value={filterTemplateId?.toString() || ''}
              onChange={(e) => setFilterTemplate(e.target.value ? parseInt(e.target.value) : null)}
              options={templateOptions}
            />
          </div>
        </div>
      </Card>

      {/* 変換履歴一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>変換一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && conversions.length === 0 ? (
            <LoadingCard message="変換履歴を読み込み中..." />
          ) : conversions.length === 0 ? (
            <EmptyState
              icon={<FileOutput className="h-12 w-12" />}
              title="変換履歴がありません"
              description="テンプレートからPDFをアップロードして変換を開始してください"
              action={
                <Link href="/templates">
                  <Button>テンプレート一覧へ</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {conversions.map((conversion) => (
                <div
                  key={conversion.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900 truncate">
                        {conversion.original_filename}
                      </span>
                      <StatusBadge status={conversion.status} />
                    </div>
                    <div className="text-sm text-gray-500">
                      <Link
                        href={`/templates/${conversion.template_id}`}
                        className="text-primary-600 hover:underline"
                      >
                        {getTemplateName(conversion.template_id)}
                      </Link>
                      {' ・ '}
                      {getConverterLabel(conversion.converter_type)}
                      {' ・ '}
                      {formatDate(conversion.created_at)}
                    </div>
                    {conversion.status === 'processing' && (
                      <div className="text-sm text-primary-600 mt-1">
                        処理中... {conversion.processed_pages}/{conversion.total_pages} ページ
                      </div>
                    )}
                    {conversion.error_message && (
                      <div className="text-sm text-danger-500 mt-1">{conversion.error_message}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {conversion.status === 'completed' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(conversion.id)}
                          title="プレビュー"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDownload(conversion.id, conversion.original_filename)
                          }
                          title="ダウンロード"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {conversion.status === 'processing' && (
                      <RefreshCw className="h-4 w-4 text-primary-500 animate-spin" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedConversionId(conversion.id)
                        setIsDeleteDialogOpen(true)
                      }}
                      className="text-danger-500 hover:text-danger-600 hover:bg-danger-50"
                      title="削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* HTMLプレビューモーダル - Portalでbody直下にレンダリング、iframeでCSS隔離 */}
      {isPreviewOpen && previewHtml && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999]">
          {/* オーバーレイ背景 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsPreviewOpen(false)}
          />
          {/* モーダル本体 */}
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto">
              <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-xl">
                <h2 className="text-lg font-semibold">HTMLプレビュー</h2>
                <Button variant="ghost" size="sm" onClick={() => setIsPreviewOpen(false)}>
                  閉じる
                </Button>
              </div>
              <div className="flex-1 overflow-hidden bg-white rounded-b-xl">
                {/* iframeでCSSを完全に隔離 */}
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  title="HTMLプレビュー"
                  sandbox="allow-same-origin"
                  style={{ minHeight: '70vh' }}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="変換履歴を削除"
        message="この変換履歴を削除しますか？この操作は取り消せません。"
        confirmLabel="削除する"
        variant="danger"
      />
    </div>
  )
}
