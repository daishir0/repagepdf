'use client'

import { FileText, Settings, LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function Header() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
      <div className="h-full px-6 flex items-center justify-between">
        {/* ロゴ */}
        <Link href="/" className="flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary-600" />
          <span className="text-xl font-bold text-gray-900">RePage PDF</span>
        </Link>

        {/* 右側 */}
        <div className="flex items-center gap-4">
          {/* 設定 */}
          <Link
            href="/settings"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="設定"
          >
            <Settings className="h-5 w-5" />
          </Link>

          {/* ユーザーメニュー */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">{user?.name || user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="ログアウト"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
