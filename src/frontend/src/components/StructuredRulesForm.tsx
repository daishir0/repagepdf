'use client'

import { useState, useCallback } from 'react'
import type { LearnedRules } from '@/lib/types'
import { Info, AlertTriangle } from 'lucide-react'

interface StructuredRulesFormProps {
  rules: LearnedRules
  onChange: (rules: LearnedRules) => void
  validationErrors: Record<string, string>
  setValidationErrors: (errors: Record<string, string>) => void
  disabled?: boolean
}

type SectionTab = 'basic' | 'design' | 'html' | 'css' | 'instructions'

// カラーコード検証
const isValidColor = (color: string): boolean => {
  if (!color) return true
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

// URL検証
const isValidUrl = (url: string): boolean => {
  if (!url) return true
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// {{content}}プレースホルダーチェック
const hasContentPlaceholder = (template: string): boolean => {
  if (!template) return true
  return template.includes('{{content}}')
}

export function StructuredRulesForm({
  rules,
  onChange,
  validationErrors,
  setValidationErrors,
  disabled = false,
}: StructuredRulesFormProps) {
  const [activeTab, setActiveTab] = useState<SectionTab>('basic')

  const updateField = useCallback(
    <K extends keyof LearnedRules>(field: K, value: LearnedRules[K]) => {
      onChange({ ...rules, [field]: value })
    },
    [rules, onChange]
  )

  const updateNestedField = useCallback(
    (
      parent: 'design_system' | 'html_templates',
      child: string,
      subChild: string | null,
      value: string
    ) => {
      if (parent === 'design_system') {
        const current = rules.design_system || {}
        if (child === 'colors') {
          const colors = current.colors || {}
          onChange({
            ...rules,
            design_system: {
              ...current,
              colors: { ...colors, [subChild!]: value },
            },
          })
          // カラーコード検証
          if (value && !isValidColor(value)) {
            setValidationErrors({
              ...validationErrors,
              [`colors.${subChild}`]: '有効なカラーコード（#RRGGBB）を入力してください',
            })
          } else {
            const newErrors = { ...validationErrors }
            delete newErrors[`colors.${subChild}`]
            setValidationErrors(newErrors)
          }
        } else if (child === 'typography') {
          const typography = current.typography || {}
          onChange({
            ...rules,
            design_system: {
              ...current,
              typography: { ...typography, [subChild!]: value },
            },
          })
        }
      } else if (parent === 'html_templates') {
        const current = rules.html_templates || {}
        onChange({
          ...rules,
          html_templates: { ...current, [child]: value },
        })
      }
    },
    [rules, onChange, validationErrors, setValidationErrors]
  )

  const tabs: { id: SectionTab; label: string }[] = [
    { id: 'basic', label: '基本情報' },
    { id: 'design', label: 'デザイン' },
    { id: 'html', label: 'HTMLテンプレート' },
    { id: 'css', label: 'カスタムCSS' },
    { id: 'instructions', label: '変換指示' },
  ]

  return (
    <div>
      {/* サブタブ */}
      <div className="flex border-b mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            disabled={disabled}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 基本情報 */}
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              サイト名
            </label>
            <input
              type="text"
              value={rules.site_name || ''}
              onChange={(e) => updateField('site_name', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="例: My Blog"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ベースURL
            </label>
            <input
              type="text"
              value={rules.base_url || ''}
              onChange={(e) => {
                updateField('base_url', e.target.value)
                if (e.target.value && !isValidUrl(e.target.value)) {
                  setValidationErrors({
                    ...validationErrors,
                    base_url: '有効なURLを入力してください',
                  })
                } else {
                  const newErrors = { ...validationErrors }
                  delete newErrors.base_url
                  setValidationErrors(newErrors)
                }
              }}
              disabled={disabled}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 ${
                validationErrors.base_url ? 'border-danger-500' : 'border-gray-300'
              }`}
              placeholder="例: https://example.com"
            />
            {validationErrors.base_url && (
              <p className="text-sm text-danger-500 mt-1">{validationErrors.base_url}</p>
            )}
          </div>
        </div>
      )}

      {/* デザイン */}
      {activeTab === 'design' && (
        <div className="space-y-6">
          {/* カラー */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">カラー設定</h4>
            <div className="grid grid-cols-2 gap-4">
              {(['primary', 'secondary', 'text', 'background'] as const).map((colorKey) => (
                <div key={colorKey}>
                  <label className="block text-sm text-gray-600 mb-1 capitalize">
                    {colorKey === 'primary'
                      ? 'プライマリ'
                      : colorKey === 'secondary'
                      ? 'セカンダリ'
                      : colorKey === 'text'
                      ? 'テキスト'
                      : '背景'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={rules.design_system?.colors?.[colorKey] || ''}
                      onChange={(e) =>
                        updateNestedField('design_system', 'colors', colorKey, e.target.value)
                      }
                      disabled={disabled}
                      className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 ${
                        validationErrors[`colors.${colorKey}`]
                          ? 'border-danger-500'
                          : 'border-gray-300'
                      }`}
                      placeholder="#000000"
                    />
                    {rules.design_system?.colors?.[colorKey] &&
                      isValidColor(rules.design_system.colors[colorKey]!) && (
                        <div
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: rules.design_system.colors[colorKey] }}
                        />
                      )}
                  </div>
                  {validationErrors[`colors.${colorKey}`] && (
                    <p className="text-xs text-danger-500 mt-1">
                      {validationErrors[`colors.${colorKey}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* タイポグラフィ */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">タイポグラフィ</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">フォントファミリー</label>
                <input
                  type="text"
                  value={rules.design_system?.typography?.font_family || ''}
                  onChange={(e) =>
                    updateNestedField('design_system', 'typography', 'font_family', e.target.value)
                  }
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="例: 'Noto Sans JP', sans-serif"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">ベースサイズ</label>
                  <input
                    type="text"
                    value={rules.design_system?.typography?.base_size || ''}
                    onChange={(e) =>
                      updateNestedField('design_system', 'typography', 'base_size', e.target.value)
                    }
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="例: 16px"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">見出しウェイト</label>
                  <input
                    type="text"
                    value={rules.design_system?.typography?.heading_weight || ''}
                    onChange={(e) =>
                      updateNestedField(
                        'design_system',
                        'typography',
                        'heading_weight',
                        e.target.value
                      )
                    }
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="例: 700"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HTMLテンプレート */}
      {activeTab === 'html' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              各要素のHTMLテンプレートを定義します。
              <code className="bg-blue-100 px-1 rounded">{'{{content}}'}</code>
              プレースホルダーが内容に置換されます。
            </p>
          </div>
          {(
            [
              { key: 'h1', label: '見出し1 (H1)' },
              { key: 'h2', label: '見出し2 (H2)' },
              { key: 'h3', label: '見出し3 (H3)' },
              { key: 'p', label: '段落 (P)' },
              { key: 'ul', label: '箇条書き (UL)' },
              { key: 'ol', label: '番号付きリスト (OL)' },
              { key: 'table', label: 'テーブル (TABLE)' },
              { key: 'blockquote', label: '引用 (BLOCKQUOTE)' },
            ] as const
          ).map(({ key, label }) => {
            const value = rules.html_templates?.[key] || ''
            const hasPlaceholder = hasContentPlaceholder(value)
            return (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <textarea
                  value={value}
                  onChange={(e) => updateNestedField('html_templates', key, null, e.target.value)}
                  disabled={disabled}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder={`例: <${key}>{{content}}</${key}>`}
                />
                {value && !hasPlaceholder && (
                  <div className="flex items-center gap-1 mt-1 text-warning-600 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{'{{content}}'} プレースホルダーがありません</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* カスタムCSS */}
      {activeTab === 'css' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">インラインCSS</label>
          <textarea
            value={rules.inline_css || ''}
            onChange={(e) => updateField('inline_css', e.target.value)}
            disabled={disabled}
            rows={15}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="/* カスタムCSSを入力 */
.content h1 {
  font-size: 2rem;
  color: #333;
}"
          />
        </div>
      )}

      {/* 変換指示 */}
      {activeTab === 'instructions' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">変換指示</label>
            <textarea
              value={rules.conversion_instructions || ''}
              onChange={(e) => updateField('conversion_instructions', e.target.value)}
              disabled={disabled}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="PDF変換時の特別な指示を入力してください..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              特別な機能（タグ形式で入力）
            </label>
            <input
              type="text"
              value={rules.special_features?.join(', ') || ''}
              onChange={(e) => {
                const features = e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter((s) => s)
                updateField('special_features', features.length > 0 ? features : undefined)
              }}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="例: TOC生成, 画像最適化, コードハイライト"
            />
            <p className="text-xs text-gray-500 mt-1">カンマ区切りで複数入力できます</p>
          </div>
        </div>
      )}
    </div>
  )
}
