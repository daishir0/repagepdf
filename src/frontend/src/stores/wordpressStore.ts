/**
 * WordPressストア
 */
import { create } from 'zustand'
import { wordpressApi } from '@/lib/api'
import type {
  WPConnectionTestResult,
  WPCategory,
  WPTag,
  WPPublishRequest,
  WPPublishResponse,
  WPHistoryItem,
  WPHistoryFilter,
} from '@/lib/types'
import toast from 'react-hot-toast'

interface WordPressState {
  // 接続テスト
  connectionTestResult: WPConnectionTestResult | null
  isTestingConnection: boolean
  // カテゴリ・タグ
  categories: WPCategory[]
  tags: WPTag[]
  isLoadingCategories: boolean
  isLoadingTags: boolean
  // 公開
  isPublishing: boolean
  publishResult: WPPublishResponse | null
  // 履歴
  history: WPHistoryItem[]
  historyTotal: number
  historyPage: number
  isLoadingHistory: boolean
  // アクション
  testConnection: () => Promise<WPConnectionTestResult>
  fetchCategories: () => Promise<void>
  fetchTags: () => Promise<void>
  publish: (request: WPPublishRequest) => Promise<WPPublishResponse>
  fetchHistory: (page?: number, filter?: WPHistoryFilter) => Promise<void>
  retryPublish: (historyId: number) => Promise<WPPublishResponse>
  clearPublishResult: () => void
  reset: () => void
}

const initialState = {
  connectionTestResult: null,
  isTestingConnection: false,
  categories: [],
  tags: [],
  isLoadingCategories: false,
  isLoadingTags: false,
  isPublishing: false,
  publishResult: null,
  history: [],
  historyTotal: 0,
  historyPage: 1,
  isLoadingHistory: false,
}

export const useWordPressStore = create<WordPressState>((set) => ({
  ...initialState,

  testConnection: async () => {
    set({ isTestingConnection: true })
    try {
      const response = await wordpressApi.testConnection()
      if (response.success && response.data) {
        set({ connectionTestResult: response.data, isTestingConnection: false })
        if (response.data.valid) {
          toast.success(`WordPress接続成功: ${response.data.site_name}`)
        } else {
          toast.error(response.data.error_message || 'WordPress接続に失敗しました')
        }
        return response.data
      }
      throw new Error('接続テストに失敗しました')
    } catch (error) {
      const errorResult: WPConnectionTestResult = {
        valid: false,
        error_message: '接続テスト中にエラーが発生しました',
      }
      set({ connectionTestResult: errorResult, isTestingConnection: false })
      toast.error('WordPress接続テストに失敗しました')
      return errorResult
    }
  },

  fetchCategories: async () => {
    set({ isLoadingCategories: true })
    try {
      const response = await wordpressApi.getCategories()
      if (response.success && response.data) {
        set({ categories: response.data.categories, isLoadingCategories: false })
      }
    } catch (error) {
      set({ isLoadingCategories: false })
      toast.error('カテゴリの取得に失敗しました')
    }
  },

  fetchTags: async () => {
    set({ isLoadingTags: true })
    try {
      const response = await wordpressApi.getTags()
      if (response.success && response.data) {
        set({ tags: response.data.tags, isLoadingTags: false })
      }
    } catch (error) {
      set({ isLoadingTags: false })
      toast.error('タグの取得に失敗しました')
    }
  },

  publish: async (request: WPPublishRequest) => {
    set({ isPublishing: true, publishResult: null })
    try {
      const response = await wordpressApi.publish(request)
      if (response.success && response.data) {
        set({ publishResult: response.data, isPublishing: false })
        if (response.data.success) {
          toast.success('WordPressへの公開が完了しました')
        } else {
          toast.error(response.data.error_message || '公開に失敗しました')
        }
        return response.data
      }
      throw new Error('公開に失敗しました')
    } catch (error) {
      const errorResult: WPPublishResponse = {
        success: false,
        error_message: '公開中にエラーが発生しました',
      }
      set({ publishResult: errorResult, isPublishing: false })
      toast.error('WordPressへの公開に失敗しました')
      return errorResult
    }
  },

  fetchHistory: async (page = 1, filter?: WPHistoryFilter) => {
    set({ isLoadingHistory: true })
    try {
      const response = await wordpressApi.getHistory(page, 20, filter)
      if (response.success && response.data) {
        set({
          history: response.data.items,
          historyTotal: response.data.total,
          historyPage: response.data.page,
          isLoadingHistory: false,
        })
      }
    } catch (error) {
      set({ isLoadingHistory: false })
      toast.error('公開履歴の取得に失敗しました')
    }
  },

  retryPublish: async (historyId: number) => {
    set({ isPublishing: true, publishResult: null })
    try {
      const response = await wordpressApi.retryPublish(historyId)
      if (response.success && response.data) {
        set({ publishResult: response.data, isPublishing: false })
        if (response.data.success) {
          toast.success('リトライが完了しました')
        } else {
          toast.error(response.data.error_message || 'リトライに失敗しました')
        }
        return response.data
      }
      throw new Error('リトライに失敗しました')
    } catch (error) {
      const errorResult: WPPublishResponse = {
        success: false,
        error_message: 'リトライ中にエラーが発生しました',
      }
      set({ publishResult: errorResult, isPublishing: false })
      toast.error('リトライに失敗しました')
      return errorResult
    }
  },

  clearPublishResult: () => {
    set({ publishResult: null })
  },

  reset: () => {
    set(initialState)
  },
}))
