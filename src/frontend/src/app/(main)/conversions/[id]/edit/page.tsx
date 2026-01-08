'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Globe } from 'lucide-react'
import Link from 'next/link'
import { conversionApi } from '@/lib/api'
import { SideBySideLayout } from '@/components/SideBySideLayout'
import { PDFPane } from '@/components/PDFPane'
import { EditorPane } from '@/components/EditorPane'
import { WordPressPublishDialog } from '@/components/WordPressPublishDialog'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useSettingsStore } from '@/stores'
import type { Conversion } from '@/lib/types'

export default function EditConversionPage() {
  const params = useParams()
  const router = useRouter()
  const conversionId = Number(params.id)
  const { settings, fetchSettings } = useSettingsStore()

  const [conversion, setConversion] = useState<Conversion | null>(null)
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false)

  // 設定を取得
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [conversionRes, html] = await Promise.all([
          conversionApi.get(conversionId),
          conversionApi.getHtml(conversionId),
        ])

        if (conversionRes.data) {
          setConversion(conversionRes.data)
          setHtmlContent(html)
        } else {
          setError('変換データが見つかりません')
        }
      } catch (err) {
        console.error('Failed to fetch conversion:', err)
        setError('データの取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    if (conversionId) {
      fetchData()
    }
  }, [conversionId])

  // 保存処理
  const handleSave = useCallback(
    async (html: string) => {
      await conversionApi.updateHtml(conversionId, html)
    },
    [conversionId]
  )

  // ローディング中
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-600">読み込み中...</p>
      </div>
    )
  }

  // エラー
  if (error || !conversion) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-danger-500 mb-4">{error || '変換データが見つかりません'}</p>
        <Button variant="outline" onClick={() => router.push('/conversions')}>
          変換履歴に戻る
        </Button>
      </div>
    )
  }

  // PDFファイルのURL生成
  const pdfUrl = `/api/conversions/${conversionId}/pdf`

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200">
        <Link href="/conversions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">
            {conversion.original_filename}
          </h1>
          <p className="text-sm text-gray-500">PDF/HTML比較編集</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPublishDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Globe className="h-4 w-4" />
          WordPressに公開
        </Button>
      </div>

      {/* WordPress公開ダイアログ */}
      <WordPressPublishDialog
        isOpen={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        conversionId={conversionId}
        defaultTitle={conversion.original_filename.replace(/\.pdf$/i, '')}
      />

      {/* サイドバイサイドレイアウト */}
      <div className="flex-1 overflow-hidden">
        <SideBySideLayout
          leftPane={<PDFPane pdfUrl={pdfUrl} />}
          rightPane={
            <EditorPane initialContent={htmlContent} onSave={handleSave} />
          }
          initialLeftWidth={50}
          minWidth={20}
        />
      </div>
    </div>
  )
}
