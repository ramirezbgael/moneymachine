import React from 'react'

type Variant = 'primary' | 'secondary' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: React.ReactNode
  className?: string
}

const base =
  'inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--accent-soft)] border border-[var(--accent)] text-[var(--accent)] shadow-[0_0_14px_var(--accent-glow)] hover:bg-[var(--accent-soft)] hover:border-[var(--accent)] hover:shadow-[0_0_18px_var(--accent-glow)]',
  secondary:
    'bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--panel)] hover:border-[var(--accent-soft)] hover:text-[var(--accent)]',
  danger:
    'bg-[var(--danger)]/12 border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/18 hover:shadow-[0_0_18px_var(--danger)]/25',
}

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export function LiquidButton({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: LiquidButtonProps) {
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
