import React from 'react'

interface SettingsSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export function SettingsSection({ title, description, children, actions }: SettingsSectionProps) {
  return (
    <div className="rounded-3xl bg-[var(--panel)] border border-[var(--border)] backdrop-blur-md shadow-[var(--shadow)] p-6 md:p-7 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
          {description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
        </div>
        {actions && <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
      <div className="border-t border-[var(--border)] pt-4">
        {children}
      </div>
    </div>
  )
}

