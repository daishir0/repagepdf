/**
 * RePage PDF - APIクライアント
 */
import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import type {
  ApiResponse,
  PaginatedResponse,
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  Template,
  TemplateCreate,
  TemplateUpdate,
  Conversion,
  ExtractedImage,
  UserSettings,
  SettingsUpdate,
} from './types'

// APIクライアントインスタンス
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// リクエストインターセプター（トークン付与）
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// レスポンスインターセプター（エラーハンドリング）
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiResponse<never>>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ===== 認証 =====
export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
      email: data.email,
      password: data.password,
    })
    // APIレスポンスのdata部分を返す
    return response.data.data as LoginResponse
  },

  register: async (data: RegisterRequest): Promise<ApiResponse<User>> => {
    const response = await api.post<ApiResponse<User>>('/auth/register', data)
    return response.data
  },

  me: async (): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>('/auth/me')
    return response.data
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
    return response.data
  },
}

// ===== テンプレート =====
export const templateApi = {
  list: async (page = 1, size = 20): Promise<ApiResponse<PaginatedResponse<Template>>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<Template>>>('/templates', {
      params: { page, size },
    })
    return response.data
  },

  get: async (id: number): Promise<ApiResponse<Template>> => {
    const response = await api.get<ApiResponse<Template>>(`/templates/${id}`)
    return response.data
  },

  create: async (data: TemplateCreate): Promise<ApiResponse<Template>> => {
    const response = await api.post<ApiResponse<Template>>('/templates', {
      name: data.name,
      url1: data.url1,
      url2: data.url2 || null,
      url3: data.url3 || null,
    })
    return response.data
  },

  update: async (id: number, data: TemplateUpdate): Promise<ApiResponse<Template>> => {
    const response = await api.put<ApiResponse<Template>>(`/templates/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/templates/${id}`)
    return response.data
  },

  learn: async (id: number): Promise<ApiResponse<Template>> => {
    const response = await api.post<ApiResponse<Template>>(`/templates/${id}/learn`)
    return response.data
  },

  relearn: async (id: number): Promise<ApiResponse<Template>> => {
    // Alias for learn - same endpoint
    const response = await api.post<ApiResponse<Template>>(`/templates/${id}/learn`)
    return response.data
  },

  getHtml: async (id: number): Promise<string> => {
    const response = await api.get<string>(`/templates/${id}/html`, {
      responseType: 'text',
    })
    return response.data
  },
}

// ===== 変換 =====
export const conversionApi = {
  list: async (
    page = 1,
    size = 20,
    templateId?: number,
    status?: string
  ): Promise<ApiResponse<PaginatedResponse<Conversion>>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<Conversion>>>('/conversions', {
      params: { page, size, template_id: templateId, status },
    })
    return response.data
  },

  get: async (id: number): Promise<ApiResponse<Conversion>> => {
    const response = await api.get<ApiResponse<Conversion>>(`/conversions/${id}`)
    return response.data
  },

  create: async (file: File, templateId: number, converterType?: string): Promise<ApiResponse<Conversion>> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('template_id', templateId.toString())
    if (converterType) {
      formData.append('converter_type', converterType)
    }
    const response = await api.post<ApiResponse<Conversion>>('/conversions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/conversions/${id}`)
    return response.data
  },

  getHtml: async (id: number): Promise<string> => {
    const response = await api.get<string>(`/conversions/${id}/html`, {
      responseType: 'text',
    })
    return response.data
  },

  getImages: async (id: number): Promise<ApiResponse<ExtractedImage[]>> => {
    const response = await api.get<ApiResponse<ExtractedImage[]>>(`/conversions/${id}/images`)
    return response.data
  },

  downloadHtml: async (id: number): Promise<Blob> => {
    const response = await api.get(`/conversions/${id}/download`, {
      responseType: 'blob',
    })
    return response.data
  },

  generate: async (id: number): Promise<ApiResponse<{ id: number; status: string; message: string }>> => {
    const response = await api.post<ApiResponse<{ id: number; status: string; message: string }>>(
      `/conversions/${id}/generate`
    )
    return response.data
  },
}

// ===== 設定 =====
export const settingsApi = {
  get: async (): Promise<ApiResponse<UserSettings>> => {
    const response = await api.get<ApiResponse<UserSettings>>('/settings')
    return response.data
  },

  update: async (data: SettingsUpdate): Promise<ApiResponse<UserSettings>> => {
    const response = await api.put<ApiResponse<UserSettings>>('/settings', data)
    return response.data
  },

  testOpenAI: async (): Promise<ApiResponse<{ valid: boolean; message: string }>> => {
    const response = await api.post<ApiResponse<{ valid: boolean; message: string }>>('/settings/test-openai')
    return response.data
  },

  testAnthropic: async (): Promise<ApiResponse<{ valid: boolean; message: string }>> => {
    const response = await api.post<ApiResponse<{ valid: boolean; message: string }>>('/settings/test-anthropic')
    return response.data
  },
}

export default api
