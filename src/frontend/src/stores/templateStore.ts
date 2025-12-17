/**
 * テンプレートストア
 */
import { create } from 'zustand'
import { templateApi } from '@/lib/api'
import type { Template, TemplateCreate, TemplateUpdate } from '@/lib/types'
import toast from 'react-hot-toast'

interface TemplateState {
  templates: Template[]
  selectedTemplate: Template | null
  isLoading: boolean
  totalPages: number
  currentPage: number
  fetchTemplates: (page?: number) => Promise<void>
  createTemplate: (data: TemplateCreate) => Promise<Template>
  updateTemplate: (id: number, data: TemplateUpdate) => Promise<void>
  deleteTemplate: (id: number) => Promise<void>
  selectTemplate: (template: Template | null) => void
  relearnTemplate: (id: number) => Promise<void>
  refreshTemplate: (id: number) => Promise<void>
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  selectedTemplate: null,
  isLoading: false,
  totalPages: 1,
  currentPage: 1,

  fetchTemplates: async (page = 1) => {
    set({ isLoading: true })
    try {
      const response = await templateApi.list(page, 20)
      if (response.success && response.data) {
        set({
          templates: response.data.items,
          totalPages: response.data.pages,
          currentPage: page,
          isLoading: false,
        })
      }
    } catch (error) {
      toast.error('テンプレートの取得に失敗しました')
      set({ isLoading: false })
    }
  },

  createTemplate: async (data: TemplateCreate) => {
    set({ isLoading: true })
    try {
      const response = await templateApi.create(data)
      if (response.success && response.data) {
        const template = response.data
        set((state) => ({
          templates: [template, ...state.templates],
          isLoading: false,
        }))
        toast.success('テンプレートを作成しました。学習を開始しています...')

        // 学習を開始
        try {
          await templateApi.learn(template.id)
        } catch {
          // 学習開始の失敗は警告のみ（テンプレートは作成済み）
          toast.error('学習の開始に失敗しました。再学習ボタンから再試行してください。')
        }

        return template
      }
      throw new Error('作成に失敗しました')
    } catch (error) {
      set({ isLoading: false })
      toast.error('テンプレートの作成に失敗しました')
      throw error
    }
  },

  updateTemplate: async (id: number, data: TemplateUpdate) => {
    try {
      const response = await templateApi.update(id, data)
      if (response.success && response.data) {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? response.data! : t)),
          selectedTemplate: state.selectedTemplate?.id === id ? response.data! : state.selectedTemplate,
        }))
        toast.success('テンプレートを更新しました')
      }
    } catch (error) {
      toast.error('テンプレートの更新に失敗しました')
      throw error
    }
  },

  deleteTemplate: async (id: number) => {
    try {
      const response = await templateApi.delete(id)
      if (response.success) {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          selectedTemplate: state.selectedTemplate?.id === id ? null : state.selectedTemplate,
        }))
        toast.success('テンプレートを削除しました')
      }
    } catch (error) {
      toast.error('テンプレートの削除に失敗しました')
      throw error
    }
  },

  selectTemplate: (template: Template | null) => {
    set({ selectedTemplate: template })
  },

  relearnTemplate: async (id: number) => {
    try {
      const response = await templateApi.relearn(id)
      if (response.success && response.data) {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? response.data! : t)),
          selectedTemplate: state.selectedTemplate?.id === id ? response.data! : state.selectedTemplate,
        }))
        toast.success('再学習を開始しました')
      }
    } catch (error) {
      toast.error('再学習の開始に失敗しました')
      throw error
    }
  },

  refreshTemplate: async (id: number) => {
    try {
      const response = await templateApi.get(id)
      if (response.success && response.data) {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? response.data! : t)),
          selectedTemplate: state.selectedTemplate?.id === id ? response.data! : state.selectedTemplate,
        }))
      }
    } catch {
      // サイレント失敗
    }
  },
}))
