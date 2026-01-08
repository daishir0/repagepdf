/**
 * バッチストア
 */
import { create } from 'zustand'
import { batchApi, conversionApi } from '@/lib/api'
import type { Batch, BatchDetail, QueuedFile } from '@/lib/types'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'

interface BatchState {
  // キュー内のファイル
  queuedFiles: QueuedFile[]
  // 現在のバッチID
  currentBatchId: string | null
  // 現在のバッチ情報
  currentBatch: Batch | null
  // 変換中かどうか
  isConverting: boolean
  // バッチ一覧
  batches: Batch[]
  // ローディング状態
  isLoading: boolean

  // アクション
  addFiles: (files: File[]) => void
  removeFile: (fileId: string) => void
  clearFiles: () => void
  startBatch: (templateId: number, converterType: string) => Promise<void>
  cancelBatch: () => Promise<void>
  updateFileStatus: (fileId: string, status: QueuedFile['status'], errorMessage?: string) => void
  fetchBatches: () => Promise<void>
  deleteBatch: (batchId: string) => Promise<void>
  refreshBatch: (batchId: string) => Promise<void>
}

export const useBatchStore = create<BatchState>((set, get) => ({
  queuedFiles: [],
  currentBatchId: null,
  currentBatch: null,
  isConverting: false,
  batches: [],
  isLoading: false,

  addFiles: (files: File[]) => {
    const newFiles: QueuedFile[] = files
      .filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
      .map((file) => ({
        id: uuidv4(),
        file,
        status: 'pending' as const,
      }))

    if (newFiles.length < files.length) {
      toast.error('PDFファイル以外はスキップされました')
    }

    if (newFiles.length > 0) {
      set((state) => ({
        queuedFiles: [...state.queuedFiles, ...newFiles],
      }))
    }
  },

  removeFile: (fileId: string) => {
    set((state) => ({
      queuedFiles: state.queuedFiles.filter((f) => f.id !== fileId),
    }))
  },

  clearFiles: () => {
    set({ queuedFiles: [], currentBatchId: null, currentBatch: null, isConverting: false })
  },

  startBatch: async (templateId: number, converterType: string) => {
    const { queuedFiles } = get()
    if (queuedFiles.length === 0) {
      toast.error('ファイルを追加してください')
      return
    }

    set({ isConverting: true })

    // 全ファイルを uploading に
    set((state) => ({
      queuedFiles: state.queuedFiles.map((f) => ({ ...f, status: 'uploading' as const })),
    }))

    try {
      const files = queuedFiles.map((qf) => qf.file)
      const response = await batchApi.create(files, templateId, converterType)

      if (response.success && response.data) {
        const batch = response.data
        set({
          currentBatchId: batch.id,
          currentBatch: batch,
        })

        // 全ファイルを converting に
        set((state) => ({
          queuedFiles: state.queuedFiles.map((f) => ({ ...f, status: 'converting' as const })),
        }))

        toast.success(`${files.length}件のファイルをアップロードしました`)

        // バッチ処理を開始
        try {
          await batchApi.start(batch.id)
        } catch {
          toast.error('変換処理の開始に失敗しました')
        }

        // 定期的にステータスを更新
        const checkStatus = async () => {
          const batchResponse = await batchApi.get(batch.id)
          if (batchResponse.success && batchResponse.data) {
            const updatedBatch = batchResponse.data
            set({ currentBatch: updatedBatch })

            // 変換の進捗をファイルにマッピング
            const { queuedFiles } = get()
            const conversions = updatedBatch.conversions || []

            // ファイル名でマッチングして進捗を更新
            const updatedFiles = queuedFiles.map((f, index) => {
              // インデックスで対応するコンバージョンを探す（アップロード順と同じ前提）
              const conversion = conversions[index]
              if (conversion) {
                let status: QueuedFile['status'] = f.status
                let progress = f.progress || 0

                if (conversion.status === 'completed' || conversion.status === 'approved') {
                  status = 'completed'
                  progress = 100
                } else if (conversion.status === 'error' || conversion.status === 'failed') {
                  status = 'error'
                } else if (conversion.status === 'converting') {
                  status = 'converting'
                  progress = conversion.progress || 0
                } else if (conversion.status === 'uploaded') {
                  status = 'converting'
                  progress = 0
                }

                return { ...f, status, progress, conversionId: conversion.id }
              }
              return f
            })
            set({ queuedFiles: updatedFiles })

            // まだ処理中なら続ける
            if (updatedBatch.status === 'processing' || updatedBatch.status === 'pending') {
              setTimeout(checkStatus, 1000) // 進捗を見せるため1秒に短縮
            } else {
              set({ isConverting: false })
              const completedCount = updatedBatch.completed_files
              const failedCount = updatedBatch.failed_files
              if (updatedBatch.status === 'completed') {
                toast.success('すべてのファイルの変換が完了しました')
              } else if (updatedBatch.status === 'partial') {
                toast.success(`${completedCount}件完了、${failedCount}件失敗`)
              } else if (updatedBatch.status === 'cancelled') {
                toast('バッチがキャンセルされました')
              }
            }
          }
        }

        setTimeout(checkStatus, 1000) // 進捗を見せるため1秒に短縮
      }
    } catch (error) {
      set({ isConverting: false })
      set((state) => ({
        queuedFiles: state.queuedFiles.map((f) => ({ ...f, status: 'error' as const })),
      }))
      toast.error('バッチの作成に失敗しました')
      throw error
    }
  },

  cancelBatch: async () => {
    const { currentBatchId } = get()
    if (!currentBatchId) return

    try {
      const response = await batchApi.cancel(currentBatchId)
      if (response.success) {
        set((state) => ({
          currentBatch: response.data ?? state.currentBatch,
          isConverting: false,
          queuedFiles: state.queuedFiles.map((f) =>
            f.status === 'converting' ? { ...f, status: 'cancelled' as const } : f
          ),
        }))
        toast.success('バッチをキャンセルしました')
      }
    } catch (error) {
      toast.error('キャンセルに失敗しました')
      throw error
    }
  },

  updateFileStatus: (fileId: string, status: QueuedFile['status'], errorMessage?: string) => {
    set((state) => ({
      queuedFiles: state.queuedFiles.map((f) =>
        f.id === fileId ? { ...f, status, errorMessage } : f
      ),
    }))
  },

  fetchBatches: async () => {
    set({ isLoading: true })
    try {
      const response = await batchApi.list()
      if (response.success && response.data) {
        set({ batches: response.data.items, isLoading: false })
      }
    } catch (error) {
      toast.error('バッチ一覧の取得に失敗しました')
      set({ isLoading: false })
    }
  },

  deleteBatch: async (batchId: string) => {
    try {
      const response = await batchApi.delete(batchId)
      if (response.success) {
        set((state) => ({
          batches: state.batches.filter((b) => b.id !== batchId),
        }))
        toast.success('バッチを削除しました')
      }
    } catch (error) {
      toast.error('バッチの削除に失敗しました')
      throw error
    }
  },

  refreshBatch: async (batchId: string) => {
    try {
      const response = await batchApi.get(batchId)
      if (response.success && response.data) {
        set((state) => ({
          batches: state.batches.map((b) => (b.id === batchId ? response.data! : b)),
        }))
      }
    } catch {
      // サイレント失敗
    }
  },
}))
