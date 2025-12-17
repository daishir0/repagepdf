import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * クラス名をマージするユーティリティ
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 日付をフォーマット
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * ファイルサイズをフォーマット
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * ステータスの日本語表示
 */
export function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待機中',
    processing: '処理中',
    completed: '完了',
    failed: '失敗',
  }
  return statusMap[status] || status
}

/**
 * ステータスの色クラス
 */
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}

/**
 * コンバータータイプの日本語表示
 */
export function getConverterLabel(converter: string): string {
  const converterMap: Record<string, string> = {
    pymupdf: 'PyMuPDF',
    pdfplumber: 'pdfplumber',
    openai: 'OpenAI Vision',
    claude: 'Claude Vision',
  }
  return converterMap[converter] || converter
}
