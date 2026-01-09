'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTemplateStore } from '@/stores'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { StructuredRulesForm } from './StructuredRulesForm'
import { JsonRulesEditor } from './JsonRulesEditor'
import type { LearnedRules } from '@/lib/types'
import { Save, Code, List } from 'lucide-react'

interface TemplateRulesEditorProps {
  templateId: number
  learnedRules: LearnedRules | null | undefined
  isLearning: boolean
}

export function TemplateRulesEditor({
  templateId,
  learnedRules,
  isLearning,
}: TemplateRulesEditorProps) {
  const { updateRules } = useTemplateStore()

  const [editMode, setEditMode] = useState<'structured' | 'json'>('structured')
  const [rules, setRules] = useState<LearnedRules>(learnedRules || {})
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // learnedRulesが変更されたら反映
  useEffect(() => {
    if (learnedRules) {
      setRules(learnedRules)
      setIsDirty(false)
    }
  }, [learnedRules])

  // 離脱時の確認
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const handleRulesChange = useCallback((newRules: LearnedRules) => {
    setRules(newRules)
    setIsDirty(true)
  }, [])

  const handleJsonParse = useCallback((parsedRules: LearnedRules | null, error: string | null) => {
    setJsonError(error)
    if (parsedRules) {
      setRules(parsedRules)
      setIsDirty(true)
    }
  }, [])

  const handleSave = async () => {
    if (jsonError) return

    setIsSaving(true)
    try {
      await updateRules(templateId, rules)
      setIsDirty(false)
    } catch {
      // エラーはストアでハンドリング
    } finally {
      setIsSaving(false)
    }
  }

  // 学習中の場合
  if (isLearning) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <p>テンプレートを学習中です...</p>
            <p className="text-sm mt-2">学習が完了するとルールを編集できます</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>ルール編集</CardTitle>
          <div className="flex items-center gap-2">
            {/* モード切り替え */}
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setEditMode('structured')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 ${
                  editMode === 'structured'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <List className="h-4 w-4" />
                フォーム
              </button>
              <button
                onClick={() => setEditMode('json')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 ${
                  editMode === 'json'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Code className="h-4 w-4" />
                JSON
              </button>
            </div>

            {/* 保存ボタン */}
            <Button
              onClick={handleSave}
              disabled={!isDirty || isSaving || !!jsonError}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
        {isDirty && (
          <p className="text-sm text-warning-600 mt-2">未保存の変更があります</p>
        )}
      </CardHeader>
      <CardContent>
        {editMode === 'structured' ? (
          <StructuredRulesForm
            rules={rules}
            onChange={handleRulesChange}
            validationErrors={validationErrors}
            setValidationErrors={setValidationErrors}
          />
        ) : (
          <JsonRulesEditor
            value={JSON.stringify(rules, null, 2)}
            onChange={(value) => {
              try {
                const parsed = JSON.parse(value)
                handleJsonParse(parsed, null)
              } catch (e) {
                handleJsonParse(null, (e as Error).message)
              }
            }}
            error={jsonError}
          />
        )}
      </CardContent>
    </Card>
  )
}
