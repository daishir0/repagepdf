'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'

interface FileDropzoneProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onClear: () => void
  accept?: Record<string, string[]>
  maxSize?: number
  disabled?: boolean
}

export function FileDropzone({
  onFileSelect,
  selectedFile,
  onClear,
  accept = { 'application/pdf': ['.pdf'] },
  maxSize = 50 * 1024 * 1024, // 50MB
  disabled = false,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled,
  })

  if (selectedFile) {
    return (
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <button
            onClick={onClear}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={disabled}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
        isDragActive && !isDragReject && 'border-primary-500 bg-primary-50',
        isDragReject && 'border-danger-500 bg-danger-50',
        !isDragActive && !isDragReject && 'border-gray-300 hover:border-primary-400 hover:bg-gray-50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      <Upload
        className={cn(
          'h-12 w-12 mx-auto mb-4',
          isDragActive && !isDragReject && 'text-primary-500',
          isDragReject && 'text-danger-500',
          !isDragActive && !isDragReject && 'text-gray-400'
        )}
      />
      {isDragActive && !isDragReject ? (
        <p className="text-primary-600 font-medium">ここにドロップしてください</p>
      ) : isDragReject ? (
        <p className="text-danger-600 font-medium">PDFファイルのみアップロード可能です</p>
      ) : (
        <>
          <p className="text-gray-700 font-medium mb-1">
            PDFファイルをドラッグ&ドロップ
          </p>
          <p className="text-gray-500 text-sm">
            または<span className="text-primary-600">クリックして選択</span>
          </p>
          <p className="text-gray-400 text-xs mt-2">最大 {formatFileSize(maxSize)}</p>
        </>
      )}
    </div>
  )
}
