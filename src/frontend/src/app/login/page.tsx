'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { Button, Input, Card } from '@/components/ui'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, isAuthenticated, checkAuth } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/templates')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('メールアドレスとパスワードを入力してください')
      return
    }

    setIsSubmitting(true)
    try {
      await login(email, password)
      toast.success('ログインしました')
      router.push('/templates')
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'ログインに失敗しました'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md" padding="lg">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <FileText className="h-10 w-10 text-primary-600" />
            <span className="text-2xl font-bold text-gray-900">RePage PDF</span>
          </div>
          <p className="text-gray-600">PDFをHTMLに変換するツール</p>
        </div>

        {/* ログインフォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="メールアドレス"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            autoComplete="email"
          />
          <Input
            label="パスワード"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            autoComplete="current-password"
          />
          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
          >
            ログイン
          </Button>
        </form>

        {/* ヒント */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            初期アカウント: <code className="bg-gray-200 px-1 rounded">admin@example.com</code> /
            <code className="bg-gray-200 px-1 rounded ml-1">admin123</code>
          </p>
        </div>
      </Card>
    </div>
  )
}
