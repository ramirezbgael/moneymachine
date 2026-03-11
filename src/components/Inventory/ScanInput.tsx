import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { useSettingsStore } from '../../store/settingsStore'

interface ScanInputProps {
  onScan: (code: string) => void
  placeholder?: string
  disabled?: boolean
}

export interface ScanInputRef {
  focus: () => void
}

export const ScanInput = forwardRef<ScanInputRef, ScanInputProps>(function ScanInput(
  { onScan, placeholder, disabled },
  ref
) {
  const { t } = useSettingsStore()
  const defaultPlaceholder = t('inventoryNewPage.scanInput.placeholder')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useImperativeHandle(ref, () => ({
    focus: () => {
      const el = inputRef.current
      if (el && !disabled) {
        el.focus()
        el.value = ''
        el.setSelectionRange(0, 0)
      }
    },
  }), [disabled])

  const focusAndResetCursor = useCallback(() => {
    const el = inputRef.current
    if (!el || disabled) return
    el.focus()
    el.value = ''
    el.setSelectionRange(0, 0)
  }, [disabled])

  useEffect(() => {
    if (!disabled) {
      focusAndResetCursor()
    }
  }, [disabled, focusAndResetCursor])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget
      const value = (input.value || '').trim()
      if (value) {
        onScan(value)
        input.value = ''
        input.setSelectionRange(0, 0)
        input.focus()
      }
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    if (el.value.length === 0) {
      el.setSelectionRange(0, 0)
    }
  }

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        defaultValue=""
        className="w-full rounded-2xl border border-[var(--accent)]/50 bg-[var(--panel-2)] px-4 py-2.5 text-base text-[var(--text)] placeholder-[var(--muted)] shadow-[0_0_0_1px_var(--accent)]/20 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_16px_var(--accent-glow)] transition-all"
        placeholder={placeholder ?? defaultPlaceholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoCapitalize="off"
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
})


