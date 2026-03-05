import React from 'react'

interface StockStepperProps {
  stock: number
  onDecrease: () => void
  onIncrease: () => void
  disabled?: boolean
  className?: string
}

export function StockStepper({
  stock,
  onDecrease,
  onIncrease,
  disabled = false,
  className = '',
}: StockStepperProps) {
  return (
    <div
      className={`flex items-center gap-0.5 rounded-lg bg-[var(--panel)]/50 p-0.5 ${className}`}
      role="group"
      aria-label="Ajustar stock"
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled}
        className="w-7 h-7 rounded-md flex items-center justify-center text-sm text-[var(--muted)] hover:bg-[var(--accent-soft)]/50 hover:text-[var(--accent)] transition-colors active:scale-95 disabled:opacity-40"
        aria-label="Disminuir"
      >
        −
      </button>
      <span className="min-w-[2rem] text-center text-xs text-[var(--muted)] tabular-nums">
        {stock}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled}
        className="w-7 h-7 rounded-md flex items-center justify-center text-sm text-[var(--muted)] hover:bg-[var(--accent-soft)]/50 hover:text-[var(--accent)] transition-colors active:scale-95 disabled:opacity-40"
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  )
}
