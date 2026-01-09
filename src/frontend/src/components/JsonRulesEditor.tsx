'use client'

import { useState, useCallback, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

interface JsonRulesEditorProps {
  value: string
  onChange: (value: string) => void
  error: string | null
  disabled?: boolean
}

export function JsonRulesEditor({
  value,
  onChange,
  error,
  disabled = false,
}: JsonRulesEditorProps) {
  const [localValue, setLocalValue] = useState(value)

  // 外部からのvalue変更を反映
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setLocalValue(newValue)
      onChange(newValue)
    },
    [onChange]
  )

  // JSONをフォーマット
  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(localValue)
      const formatted = JSON.stringify(parsed, null, 2)
      setLocalValue(formatted)
      onChange(formatted)
    } catch {
      // パースエラーの場合は何もしない
    }
  }, [localValue, onChange])

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">JSON編集</label>
        <button
          type="button"
          onClick={handleFormat}
          disabled={disabled || !!error}
          className="text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400"
        >
          フォーマット
        </button>
      </div>
      <textarea
        value={localValue}
        onChange={handleChange}
        disabled={disabled}
        rows={25}
        className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 ${
          error ? 'border-danger-500' : 'border-gray-300'
        }`}
        placeholder="{}"
        spellCheck={false}
      />
      {error && (
        <div className="flex items-start gap-2 mt-2 p-3 bg-danger-50 rounded-lg text-sm text-danger-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">JSON構文エラー</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
