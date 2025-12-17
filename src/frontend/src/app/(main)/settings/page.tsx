'use client'

import { useEffect, useState } from 'react'
import { Settings, Key, Cpu, Check, X } from 'lucide-react'
import { useSettingsStore, useAuthStore } from '@/stores'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  LoadingCard,
} from '@/components/ui'
import { authApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { settings, isLoading, isTesting, fetchSettings, updateSettings, testOpenAI, testAnthropic } =
    useSettingsStore()
  const { user, setUser } = useAuthStore()

  // フォーム状態
  const [defaultConverter, setDefaultConverter] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiModel, setOpenaiModel] = useState('')
  const [anthropicModel, setAnthropicModel] = useState('')
  const [autoExtractImages, setAutoExtractImages] = useState(true)
  const [imageQuality, setImageQuality] = useState(85)

  // パスワード変更
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (settings) {
      setDefaultConverter(settings.default_converter)
      setOpenaiModel(settings.openai_model)
      setAnthropicModel(settings.anthropic_model)
      setAutoExtractImages(settings.auto_extract_images)
      setImageQuality(settings.image_quality)
    }
  }, [settings])

  const converterOptions = [
    { value: 'pymupdf', label: 'PyMuPDF (高速)' },
    { value: 'pdfplumber', label: 'pdfplumber (表に強い)' },
    { value: 'openai', label: 'OpenAI Vision (高精度)' },
    { value: 'claude', label: 'Claude Vision (高精度)' },
  ]

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      await updateSettings({
        default_converter: defaultConverter,
        openai_api_key: openaiKey || undefined,
        anthropic_api_key: anthropicKey || undefined,
        openai_model: openaiModel,
        anthropic_model: anthropicModel,
        auto_extract_images: autoExtractImages,
        image_quality: imageQuality,
      })
      setOpenaiKey('')
      setAnthropicKey('')
    } catch {
      // エラーはストアでハンドリング
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('すべてのフィールドを入力してください')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('新しいパスワードが一致しません')
      return
    }
    if (newPassword.length < 6) {
      toast.error('パスワードは6文字以上で入力してください')
      return
    }

    setIsChangingPassword(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      toast.success('パスワードを変更しました')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'パスワードの変更に失敗しました'
      toast.error(message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (isLoading && !settings) {
    return <LoadingCard message="設定を読み込み中..." />
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-600 mt-1">アプリケーションの設定を管理</p>
      </div>

      <div className="grid gap-6">
        {/* 変換設定 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-gray-400" />
              <CardTitle>変換設定</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 max-w-md">
              <Select
                label="デフォルト変換方式"
                value={defaultConverter}
                onChange={(e) => setDefaultConverter(e.target.value)}
                options={converterOptions}
              />

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoExtractImages"
                  checked={autoExtractImages}
                  onChange={(e) => setAutoExtractImages(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="autoExtractImages" className="text-sm text-gray-700">
                  画像を自動抽出する
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  画像品質: {imageQuality}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={imageQuality}
                  onChange={(e) => setImageQuality(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* APIキー設定 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-gray-400" />
              <CardTitle>APIキー設定</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 max-w-lg">
              {/* OpenAI */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">OpenAI API</h4>
                  <div className="flex items-center gap-2">
                    {settings?.openai_api_key_set ? (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        設定済み
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <X className="h-4 w-4" />
                        未設定
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testOpenAI}
                      disabled={!settings?.openai_api_key_set || isTesting}
                    >
                      テスト
                    </Button>
                  </div>
                </div>
                <Input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  helperText="新しいキーを入力して保存すると更新されます"
                />
                <Input
                  label="モデル"
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                />
              </div>

              {/* Anthropic */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Anthropic API</h4>
                  <div className="flex items-center gap-2">
                    {settings?.anthropic_api_key_set ? (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        設定済み
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <X className="h-4 w-4" />
                        未設定
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testAnthropic}
                      disabled={!settings?.anthropic_api_key_set || isTesting}
                    >
                      テスト
                    </Button>
                  </div>
                </div>
                <Input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  helperText="新しいキーを入力して保存すると更新されます"
                />
                <Input
                  label="モデル"
                  value={anthropicModel}
                  onChange={(e) => setAnthropicModel(e.target.value)}
                  placeholder="claude-3-haiku-20240307"
                />
              </div>
            </div>

            <div className="mt-6">
              <Button onClick={handleSaveSettings} isLoading={isSaving}>
                設定を保存
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* アカウント設定 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-400" />
              <CardTitle>アカウント設定</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <p className="text-gray-900">{user?.email}</p>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-4">パスワード変更</h4>
                <div className="space-y-3">
                  <Input
                    type="password"
                    label="現在のパスワード"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <Input
                    type="password"
                    label="新しいパスワード"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <Input
                    type="password"
                    label="新しいパスワード（確認）"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <Button
                    onClick={handleChangePassword}
                    isLoading={isChangingPassword}
                    disabled={!currentPassword || !newPassword || !confirmPassword}
                  >
                    パスワードを変更
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
