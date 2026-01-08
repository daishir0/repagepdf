'use client'

import { useEffect, useState } from 'react'
import { Globe, ExternalLink, RefreshCw, Check, X, Calendar, Filter } from 'lucide-react'
import { useWordPressStore, useSettingsStore } from '@/stores'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Spinner,
  Input,
  EmptyState,
} from '@/components/ui'
import type { WPHistoryFilter } from '@/lib/types'

export default function WordPressHistoryPage() {
  const { settings, fetchSettings } = useSettingsStore()
  const {
    history,
    historyTotal,
    historyPage,
    isLoadingHistory,
    isPublishing,
    fetchHistory,
    retryPublish,
  } = useWordPressStore()

  const [filter, setFilter] = useState<WPHistoryFilter>({})
  const [siteFilter, setSiteFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchSettings()
    fetchHistory(1)
  }, [fetchSettings, fetchHistory])

  const handleApplyFilter = () => {
    const newFilter: WPHistoryFilter = {}
    if (siteFilter) newFilter.site = siteFilter
    if (dateFrom) newFilter.date_from = dateFrom
    if (dateTo) newFilter.date_to = dateTo
    setFilter(newFilter)
    fetchHistory(1, newFilter)
  }

  const handleClearFilter = () => {
    setSiteFilter('')
    setDateFrom('')
    setDateTo('')
    setFilter({})
    fetchHistory(1)
  }

  const handlePageChange = (page: number) => {
    fetchHistory(page, filter)
  }

  const handleRetry = async (historyId: number) => {
    await retryPublish(historyId)
    fetchHistory(historyPage, filter)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalPages = Math.ceil(historyTotal / 20)

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-6 w-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">WordPress公開履歴</h1>
        </div>
        <p className="text-gray-600">WordPressへの公開履歴を確認・管理</p>
      </div>

      {/* 未設定警告 */}
      {settings && !settings.wordpress_config?.is_configured && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <p className="text-yellow-800">
              WordPress連携が設定されていません。
              <a href="/settings" className="ml-2 text-primary-600 hover:underline font-medium">
                設定画面で連携を設定
              </a>
            </p>
          </CardContent>
        </Card>
      )}

      {/* フィルター */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-base">フィルター</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Input
                label="サイトURL"
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                placeholder="example.com"
              />
            </div>
            <div className="min-w-[160px]">
              <Input
                label="公開日（から）"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="min-w-[160px]">
              <Input
                label="公開日（まで）"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApplyFilter}>適用</Button>
              <Button variant="outline" onClick={handleClearFilter}>
                クリア
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 履歴一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>公開履歴 ({historyTotal}件)</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchHistory(historyPage, filter)}
              disabled={isLoadingHistory}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingHistory && history.length === 0 ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              icon={<Globe className="h-12 w-12" />}
              title="公開履歴がありません"
              description="WordPressへの公開履歴がここに表示されます"
            />
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                        {item.publish_status === 'success' ? (
                          <Badge variant="success">
                            <Check className="h-3 w-3 mr-1" />
                            成功
                          </Badge>
                        ) : (
                          <Badge variant="danger">
                            <X className="h-3 w-3 mr-1" />
                            失敗
                          </Badge>
                        )}
                        <Badge variant={item.status === 'publish' ? 'primary' : 'secondary'}>
                          {item.status === 'publish' ? '公開' : '下書き'}
                        </Badge>
                      </div>

                      <div className="text-sm text-gray-500 space-y-1">
                        <p className="truncate">{item.wp_site_url}</p>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.published_at)}
                        </div>
                      </div>

                      {item.publish_status === 'failed' && item.error_message && (
                        <p className="mt-2 text-sm text-red-600">{item.error_message}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.publish_status === 'success' && item.wp_post_url && (
                        <a
                          href={item.wp_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
                        >
                          投稿を確認
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {item.publish_status === 'success' && item.wp_admin_url && (
                        <a
                          href={item.wp_admin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline"
                        >
                          編集
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {item.publish_status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(item.id)}
                          disabled={isPublishing}
                          isLoading={isPublishing}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          リトライ
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(historyPage - 1)}
                    disabled={historyPage <= 1 || isLoadingHistory}
                  >
                    前へ
                  </Button>
                  <span className="flex items-center px-3 text-sm text-gray-600">
                    {historyPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(historyPage + 1)}
                    disabled={historyPage >= totalPages || isLoadingHistory}
                  >
                    次へ
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
