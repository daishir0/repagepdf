'use client'

import { MainLayout } from '@/components/layout'

export default function MainLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}
