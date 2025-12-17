/**
 * 設定ストア
 */
import { create } from 'zustand'
import { settingsApi } from '@/lib/api'
import type { UserSettings, SettingsUpdate } from '@/lib/types'
import toast from 'react-hot-toast'

interface SettingsState {
  settings: UserSettings | null
  isLoading: boolean
  isTesting: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (data: SettingsUpdate) => Promise<void>
  testOpenAI: () => Promise<boolean>
  testAnthropic: () => Promise<boolean>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,
  isTesting: false,

  fetchSettings: async () => {
    set({ isLoading: true })
    try {
      const response = await settingsApi.get()
      if (response.success && response.data) {
        set({ settings: response.data, isLoading: false })
      }
    } catch (error) {
      toast.error('設定の取得に失敗しました')
      set({ isLoading: false })
    }
  },

  updateSettings: async (data: SettingsUpdate) => {
    set({ isLoading: true })
    try {
      const response = await settingsApi.update(data)
      if (response.success && response.data) {
        set({ settings: response.data, isLoading: false })
        toast.success('設定を保存しました')
      }
    } catch (error) {
      set({ isLoading: false })
      toast.error('設定の保存に失敗しました')
      throw error
    }
  },

  testOpenAI: async () => {
    set({ isTesting: true })
    try {
      const response = await settingsApi.testOpenAI()
      if (response.success && response.data) {
        if (response.data.valid) {
          toast.success('OpenAI APIキーは有効です')
        } else {
          toast.error(`OpenAI APIキーエラー: ${response.data.message}`)
        }
        return response.data.valid
      }
      return false
    } catch (error) {
      toast.error('OpenAI APIのテストに失敗しました')
      return false
    } finally {
      set({ isTesting: false })
    }
  },

  testAnthropic: async () => {
    set({ isTesting: true })
    try {
      const response = await settingsApi.testAnthropic()
      if (response.success && response.data) {
        if (response.data.valid) {
          toast.success('Anthropic APIキーは有効です')
        } else {
          toast.error(`Anthropic APIキーエラー: ${response.data.message}`)
        }
        return response.data.valid
      }
      return false
    } catch (error) {
      toast.error('Anthropic APIのテストに失敗しました')
      return false
    } finally {
      set({ isTesting: false })
    }
  },
}))
