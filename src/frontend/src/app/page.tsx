'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores'
import { LoadingOverlay } from '@/components/ui'

export default function HomePage() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/templates')
      } else {
        router.push('/login')
      }
    }
  }, [isLoading, isAuthenticated, router])

  return <LoadingOverlay message="読み込み中..." />
}
