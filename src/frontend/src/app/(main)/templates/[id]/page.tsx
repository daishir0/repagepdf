'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Globe,
  Upload,
  FileText,
  Download,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react'
import { useTemplateStore, useConversionStore, useSettingsStore } from '@/stores'
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
import { FileDropzone } from '@/components/FileDropzone'
import { formatDate, getConverterLabel } from '@/lib/utils'
import { templateApi, conversionApi } from '@/lib/api'

export default function TemplateDetailPage() {
  const params = useParams()
  const templateId = parseInt(params.id as string, 10)
  const router = useRouter()

  const { templates, fetchTemplates, refreshTemplate } = useTemplateStore()
  const { conversions, fetchConversions, createConversion, deleteConversion, refreshConversion } =
    useConversionStore()
  const { settings, fetchSettings } = useSettingsStore()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [converterType, setConverterType] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedConversionId, setSelectedConversionId] = useState<number | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const template = templates.find((t) => t.id === templateId)
  const templateConversions = conversions.filter((c) => c.template_id === templateId)

  useEffect(() => {
    fetchTemplates()
    fetchConversions(1, templateId)
    fetchSettings()
  }, [fetchTemplates, fetchConversions, fetchSettings, templateId])

  // デフォルトコンバーター設定
  useEffect(() => {
    if (settings && !converterType) {
      setConverterType(settings.default_converter)
    }
  }, [settings, converterType])

  // ポーリング（処理中の変換がある場合）
  useEffect(() => {
    const hasProcessing = templateConversions.some(
      (c) => c.status === 'pending' || c.status === 'processing' || c.status === 'converting' || c.status === 'uploaded'
    )
    if (!hasProcessing) return

    const interval = setInterval(() => {
      templateConversions
        .filter((c) => c.status === 'pending' || c.status === 'processing' || c.status === 'converting' || c.status === 'uploaded')
        .forEach((c) => refreshConversion(c.id))
    }, 3000)

    return () => clearInterval(interval)
  }, [templateConversions, refreshConversion])

  // テンプレート学習中のポーリング
  useEffect(() => {
    if (!template || (template.status !== 'learning' && template.status !== 'pending')) return

    const interval = setInterval(() => {
      refreshTemplate(templateId)
    }, 5000)

    return () => clearInterval(interval)
  }, [template, templateId, refreshTemplate])

  const handleUpload = async () => {
    if (!selectedFile || !template) return

    setIsUploading(true)
    try {
      await createConversion(selectedFile, templateId, converterType || undefined)
      setSelectedFile(null)
    } catch {
      // エラーはストアでハンドリング
    } finally {
      setIsUploading(false)
    }
  }

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

  const converterOptions = [
    { value: 'pymupdf', label: 'PyMuPDF (高速)' },
    { value: 'pdfplumber', label: 'pdfplumber (表に強い)' },
    { value: 'openai', label: 'OpenAI Vision (高精度)' },
    { value: 'claude', label: 'Claude Vision (高精度)' },
  ]

  if (!template) {
    return <LoadingCard message="テンプレートを読み込み中..." />
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <Link
          href="/templates"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          テンプレート一覧
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
              <StatusBadge status={template.status} size="md" />
            </div>
            <div className="flex flex-col gap-1 text-gray-500 mt-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <a
                  href={template.url1}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-600"
                >
                  {template.url1}
                </a>
              </div>
              {template.url2 && (
                <div className="flex items-center gap-2 ml-6">
                  <a
                    href={template.url2}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary-600 text-sm"
                  >
                    {template.url2}
                  </a>
                </div>
              )}
              {template.url3 && (
                <div className="flex items-center gap-2 ml-6">
                  <a
                    href={template.url3}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary-600 text-sm"
                  >
                    {template.url3}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左カラム: アップロード */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>PDF変換</CardTitle>
            </CardHeader>
            <CardContent>
              {template.status !== 'ready' ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2">
                    {template.status === 'learning' || template.status === 'pending'
                      ? 'テンプレートを学習中です...'
                      : '学習が完了していません'}
                  </p>
                  {template.status === 'failed' && (
                    <p className="text-sm text-danger-500">{template.error_message}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <FileDropzone
                    onFileSelect={setSelectedFile}
                    selectedFile={selectedFile}
                    onClear={() => setSelectedFile(null)}
                    disabled={isUploading}
                  />

                  <Select
                    label="変換方式"
                    value={converterType}
                    onChange={(e) => setConverterType(e.target.value)}
                    options={converterOptions}
                  />

                  <Button
                    className="w-full"
                    onClick={handleUpload}
                    disabled={!selectedFile}
                    isLoading={isUploading}
                    leftIcon={<Upload className="h-4 w-4" />}
                  >
                    変換開始
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右カラム: 変換履歴 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>変換履歴</CardTitle>
            </CardHeader>
            <CardContent>
              {templateConversions.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-10 w-10" />}
                  title="変換履歴がありません"
                  description="PDFをアップロードして変換を開始してください"
                />
              ) : (
                <div className="space-y-3">
                  {templateConversions.map((conversion) => (
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
                          {getConverterLabel(conversion.converter_type)} ・{' '}
                          {formatDate(conversion.created_at)}
                        </div>
                        {conversion.status === 'processing' && (
                          <div className="text-sm text-primary-600 mt-1">
                            処理中... {conversion.processed_pages}/{conversion.total_pages} ページ
                          </div>
                        )}
                        {conversion.error_message && (
                          <div className="text-sm text-danger-500 mt-1">
                            {conversion.error_message}
                          </div>
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
        </div>
      </div>

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
