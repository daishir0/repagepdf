'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// PDF.js ワーカーの設定（CDN経由）
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// CMap設定（日本語などCJKフォント対応）
const cMapUrl = `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`
const cMapPacked = true

interface PDFPaneProps {
  pdfUrl: string
  className?: string
}

export function PDFPane({ pdfUrl, className = '' }: PDFPaneProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // 認証付きでPDFを取得
  useEffect(() => {
    const fetchPdf = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const token = localStorage.getItem('token')
        const response = await fetch(pdfUrl, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        setPdfData(new Uint8Array(arrayBuffer))
      } catch (err) {
        console.error('PDF fetch error:', err)
        setError('PDFの読み込みに失敗しました')
        setIsLoading(false)
      }
    }

    fetchPdf()
  }, [pdfUrl, retryCount])

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages)
      setIsLoading(false)
      setError(null)
    },
    []
  )

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error)
    setIsLoading(false)
    setError('PDFの読み込みに失敗しました')
  }, [])

  const goToPrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }, [])

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages))
  }, [numPages])

  const handleRetry = useCallback(() => {
    setPdfData(null)
    setRetryCount((prev) => prev + 1)
  }, [])

  // react-pdfに渡すfileオブジェクト（コピーを作成してデタッチエラーを防ぐ）
  const pdfFile = useMemo(() => {
    if (!pdfData) return null
    // Uint8Arrayのコピーを作成
    return { data: new Uint8Array(pdfData) }
  }, [pdfData])

  // Documentオプション（安定した参照を保持）
  const documentOptions = useMemo(
    () => ({
      cMapUrl,
      cMapPacked,
    }),
    []
  )

  return (
    <div className={`flex flex-col h-full bg-gray-100 ${className}`}>
      {/* ページナビゲーション */}
      <div className="flex items-center justify-center gap-4 py-2 bg-white border-b border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevPage}
          disabled={currentPage <= 1}
          aria-label="前のページ"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-600">
          {numPages > 0 ? `${currentPage} / ${numPages}` : '-'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextPage}
          disabled={currentPage >= numPages}
          aria-label="次のページ"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* PDF表示エリア */}
      <div className="flex-1 overflow-auto flex justify-center p-4">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <Spinner size="lg" />
              <p className="text-sm text-gray-500">PDF読み込み中...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-danger-500 mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                再読み込み
              </Button>
            </div>
          </div>
        )}

        {pdfFile && (
          <Document
            key={`pdf-${retryCount}`}
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            error={null}
            className={isLoading || error ? 'hidden' : ''}
            options={documentOptions}
          >
            <Page
              pageNumber={currentPage}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-lg"
            />
          </Document>
        )}
      </div>
    </div>
  )
}
