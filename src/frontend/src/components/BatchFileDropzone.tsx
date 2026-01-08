'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import { useBatchStore } from '@/stores'

interface BatchFileDropzoneProps {
  disabled?: boolean
  maxFiles?: number
  maxSize?: number
}

export function BatchFileDropzone({
  disabled = false,
  maxFiles = 20,
  maxSize = 50 * 1024 * 1024, // 50MB per file
}: BatchFileDropzoneProps) {
  const { addFiles, queuedFiles, isConverting } = useBatchStore()

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        // 最大ファイル数を超えないように
        const remainingSlots = maxFiles - queuedFiles.length
        const filesToAdd = acceptedFiles.slice(0, remainingSlots)

        if (filesToAdd.length < acceptedFiles.length) {
          // toast.error(`最大${maxFiles}ファイルまでアップロードできます`)
        }

        if (filesToAdd.length > 0) {
          addFiles(filesToAdd)
        }
      }
    },
    [addFiles, queuedFiles.length, maxFiles]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize,
    multiple: true,
    disabled: disabled || isConverting,
  })

  const isDisabled = disabled || isConverting

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
        isDragActive && !isDragReject && 'border-primary-500 bg-primary-50',
        isDragReject && 'border-danger-500 bg-danger-50',
        !isDragActive && !isDragReject && 'border-gray-300 hover:border-primary-400 hover:bg-gray-50',
        isDisabled && 'opacity-50 cursor-not-allowed'
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
            複数のPDFファイルをドラッグ&ドロップ
          </p>
          <p className="text-gray-500 text-sm">
            または<span className="text-primary-600">クリックして選択</span>
          </p>
          <p className="text-gray-400 text-xs mt-2">
            最大 {maxFiles}ファイル、各 {formatFileSize(maxSize)}
          </p>
          {queuedFiles.length > 0 && (
            <p className="text-primary-600 text-sm mt-2">
              {queuedFiles.length}件のファイルが選択されています
            </p>
          )}
        </>
      )}
    </div>
  )
}
