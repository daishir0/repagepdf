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
export interface LearnedRules {
  site_name?: string
  base_url?: string
  design_system?: {
    colors?: {
      primary?: string
      secondary?: string
      text?: string
      background?: string
    }
    typography?: {
      font_family?: string
      base_size?: string
      heading_weight?: string
    }
  }
  html_templates?: {
    h1?: string
    h2?: string
    h3?: string
    p?: string
    ul?: string
    ol?: string
    table?: string
    blockquote?: string
  }
  inline_css?: string
  special_features?: string[]
  conversion_instructions?: string
}

export interface Template {
  id: number
  name: string
  url1: string
  url2: string | null
  url3: string | null
  learned_html: string | null
  css_rules: string | null
  learned_rules?: LearnedRules | null
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

export interface TemplateUpdateRules {
  learned_rules: LearnedRules
}

// ===== 変換 =====
export interface Conversion {
  id: number
  template_id: number
  template_name?: string
  batch_id?: string | null
  original_filename: string
  status: 'pending' | 'uploaded' | 'converting' | 'processing' | 'completed' | 'approved' | 'failed' | 'error'
  progress: number  // 進捗率 (0-100)
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
export interface WordPressConfigStatus {
  is_configured: boolean
  has_url: boolean
  has_username: boolean
  has_password: boolean
}

export interface UserSettings {
  id: number
  default_converter: 'pymupdf' | 'pdfplumber' | 'openai' | 'claude'
  openai_api_key_set: boolean
  anthropic_api_key_set: boolean
  openai_model: string
  anthropic_model: string
  auto_extract_images: boolean
  image_quality: number
  wordpress_config: WordPressConfigStatus
}

export interface SettingsUpdate {
  default_converter?: string
  openai_api_key?: string
  anthropic_api_key?: string
  openai_model?: string
  anthropic_model?: string
  auto_extract_images?: boolean
  image_quality?: number
  wp_url?: string
  wp_username?: string
  wp_app_password?: string
}

// ===== WordPress =====
export interface WPCategory {
  id: number
  name: string
  slug: string
  count: number
}

export interface WPTag {
  id: number
  name: string
  slug: string
  count: number
}

export interface WPConnectionTestResult {
  valid: boolean
  site_name?: string
  user_name?: string
  error_message?: string
}

export interface WPPublishRequest {
  conversion_id: number
  title: string
  status: 'draft' | 'publish'
  category_ids: number[]
  tag_ids: number[]
  new_tags: string[]
}

export interface WPPublishResponse {
  success: boolean
  post_id?: number
  post_url?: string
  admin_url?: string
  error_message?: string
}

export interface WPHistoryItem {
  id: number
  conversion_id: number | null
  wp_site_url: string
  wp_post_id: number | null
  wp_post_url: string | null
  wp_admin_url: string | null
  title: string
  status: 'draft' | 'publish'
  categories: string[]
  tags: string[]
  publish_status: 'success' | 'failed'
  error_message: string | null
  published_at: string
}

export interface WPHistoryFilter {
  site?: string
  date_from?: string
  date_to?: string
}

// ===== バッチ =====
export interface Batch {
  id: string
  template_id: number
  converter_type: string
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'cancelled'
  total_files: number
  completed_files: number
  failed_files: number
  created_at: string
  updated_at: string
}

export interface BatchDetail extends Batch {
  conversions: Conversion[]
}

export interface QueuedFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'converting' | 'completed' | 'error' | 'cancelled'
  progress?: number
  errorMessage?: string
  conversionId?: number
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

export interface WordPressState {
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
}
