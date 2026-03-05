import React from 'react'

export interface SettingsMenuItem {
  id: string
  title: string
  description: string
  icon: React.ReactNode
}

interface SettingsMenuProps {
  items: SettingsMenuItem[]
  activeId: string
  onSelect: (id: string) => void
}

export function SettingsMenu({ items, activeId, onSelect }: SettingsMenuProps) {
  return (
    <nav className="hidden md:flex flex-col gap-2">
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`w-full text-left rounded-2xl border px-4 py-3 flex items-start gap-3 transition-all ${
              active
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_18px_var(--accent-glow)]'
                : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] hover:border-[var(--accent-soft)] hover:text-[var(--text)]'
            }`}
          >
            <div className={`mt-0.5 h-8 w-8 rounded-2xl flex items-center justify-center text-sm ${
              active ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-[var(--panel-2)] text-[var(--muted)]'
            }`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{item.title}</div>
              <div className="text-[11px] text-[var(--muted)] truncate">{item.description}</div>
            </div>
          </button>
        )
      })}
    </nav>
  )
}

