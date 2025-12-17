/**
 * 変換ストア
 */
import { create } from 'zustand'
import { conversionApi } from '@/lib/api'
import type { Conversion } from '@/lib/types'
import toast from 'react-hot-toast'

interface ConversionState {
  conversions: Conversion[]
  selectedConversion: Conversion | null
  isLoading: boolean
  isUploading: boolean
  totalPages: number
  currentPage: number
  filterTemplateId: number | null
  fetchConversions: (page?: number, templateId?: number) => Promise<void>
  createConversion: (file: File, templateId: number, converterType?: string) => Promise<Conversion>
  deleteConversion: (id: number) => Promise<void>
  selectConversion: (conversion: Conversion | null) => void
  refreshConversion: (id: number) => Promise<void>
  setFilterTemplate: (templateId: number | null) => void
}

export const useConversionStore = create<ConversionState>((set, get) => ({
  conversions: [],
  selectedConversion: null,
  isLoading: false,
  isUploading: false,
  totalPages: 1,
  currentPage: 1,
  filterTemplateId: null,

  fetchConversions: async (page = 1, templateId?: number) => {
    set({ isLoading: true })
    try {
      const response = await conversionApi.list(page, 20, templateId)
      if (response.success && response.data) {
        set({
          conversions: response.data.items,
          totalPages: response.data.pages,
          currentPage: page,
          filterTemplateId: templateId ?? null,
          isLoading: false,
        })
      }
    } catch (error) {
      toast.error('変換履歴の取得に失敗しました')
      set({ isLoading: false })
    }
  },

  createConversion: async (file: File, templateId: number, converterType?: string) => {
    set({ isUploading: true })
    try {
      const response = await conversionApi.create(file, templateId, converterType)
      if (response.success && response.data) {
        const conversion = response.data
        set((state) => ({
          conversions: [conversion, ...state.conversions],
          isUploading: false,
        }))
        toast.success('PDFをアップロードしました。変換を開始しています...')

        // HTML生成を開始
        try {
          await conversionApi.generate(conversion.id)
        } catch {
          // 生成開始の失敗は警告のみ（アップロードは完了済み）
          toast.error('変換の開始に失敗しました。')
        }

        return conversion
      }
      throw new Error('アップロードに失敗しました')
    } catch (error) {
      set({ isUploading: false })
      toast.error('PDFのアップロードに失敗しました')
      throw error
    }
  },

  deleteConversion: async (id: number) => {
    try {
      const response = await conversionApi.delete(id)
      if (response.success) {
        set((state) => ({
          conversions: state.conversions.filter((c) => c.id !== id),
          selectedConversion: state.selectedConversion?.id === id ? null : state.selectedConversion,
        }))
        toast.success('変換履歴を削除しました')
      }
    } catch (error) {
      toast.error('変換履歴の削除に失敗しました')
      throw error
    }
  },

  selectConversion: (conversion: Conversion | null) => {
    set({ selectedConversion: conversion })
  },

  refreshConversion: async (id: number) => {
    try {
      const response = await conversionApi.get(id)
      if (response.success && response.data) {
        set((state) => ({
          conversions: state.conversions.map((c) => (c.id === id ? response.data! : c)),
          selectedConversion: state.selectedConversion?.id === id ? response.data! : state.selectedConversion,
        }))
      }
    } catch {
      // サイレント失敗
    }
  },

  setFilterTemplate: (templateId: number | null) => {
    set({ filterTemplateId: templateId })
    get().fetchConversions(1, templateId ?? undefined)
  },
}))
