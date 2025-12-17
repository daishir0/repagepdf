/**
 * RePage PDF - 型定義
 */

// ===== 共通 =====
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

// ===== ユーザー =====
export interface User {
  id: number
  email: string
  name: string
  created_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  access_token: string
  token_type: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

// ===== テンプレート =====
export interface Template {
  id: number
  name: string
  url1: string
  url2: string | null
  url3: string | null
  learned_html: string | null
  css_rules: string | null
  status: 'pending' | 'learning' | 'ready' | 'failed'
  error_message: string | null
  user_id: number
  created_at: string
  updated_at: string
}

export interface TemplateCreate {
  name: string
  url1: string
  url2?: string
  url3?: string
}

export interface TemplateUpdate {
  name?: string
  url1?: string
  url2?: string
  url3?: string
}

// ===== 変換 =====
export interface Conversion {
  id: number
  template_id: number
  template_name?: string
  original_filename: string
  status: 'pending' | 'uploaded' | 'converting' | 'processing' | 'completed' | 'failed' | 'error'
  converter_type: 'pymupdf' | 'pdfplumber' | 'openai' | 'claude'
  result_html: string | null
  error_message: string | null
  processed_pages: number
  total_pages: number
  created_at: string
  completed_at: string | null
}

export interface ConversionCreate {
  template_id: number
  converter_type?: string
}

export interface ExtractedImage {
  id: number
  conversion_id: number
  page_number: number
  image_path: string
  alt_text: string | null
  width: number
  height: number
}

// ===== 設定 =====
export interface UserSettings {
  id: number
  default_converter: 'pymupdf' | 'pdfplumber' | 'openai' | 'claude'
  openai_api_key_set: boolean
  anthropic_api_key_set: boolean
  openai_model: string
  anthropic_model: string
  auto_extract_images: boolean
  image_quality: number
}

export interface SettingsUpdate {
  default_converter?: string
  openai_api_key?: string
  anthropic_api_key?: string
  openai_model?: string
  anthropic_model?: string
  auto_extract_images?: boolean
  image_quality?: number
}

// ===== ストア用 =====
export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export interface TemplateState {
  templates: Template[]
  selectedTemplate: Template | null
  isLoading: boolean
  fetchTemplates: () => Promise<void>
  createTemplate: (data: TemplateCreate) => Promise<Template>
  updateTemplate: (id: number, data: TemplateUpdate) => Promise<void>
  deleteTemplate: (id: number) => Promise<void>
  selectTemplate: (template: Template | null) => void
  relearnTemplate: (id: number) => Promise<void>
}

export interface ConversionState {
  conversions: Conversion[]
  selectedConversion: Conversion | null
  isLoading: boolean
  isUploading: boolean
  fetchConversions: (templateId?: number) => Promise<void>
  createConversion: (file: File, templateId: number, converterType?: string) => Promise<Conversion>
  deleteConversion: (id: number) => Promise<void>
  selectConversion: (conversion: Conversion | null) => void
}

export interface SettingsState {
  settings: UserSettings | null
  isLoading: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (data: SettingsUpdate) => Promise<void>
}
