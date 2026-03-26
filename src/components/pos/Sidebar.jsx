import React from 'react'

/**
 * App shell sidebar — low-contrast nav rail (used by Layout).
 */
export function Sidebar({
  collapsed,
  mobileOpen,
  onToggle,
  menuItems,
  activeId,
  onNavigate,
  t,
  currentTenantName
}) {
  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-[rgba(9,9,9,0.98)]">
      <div className="flex min-h-0 items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-5">
        <div
          className={`truncate text-lg font-semibold tracking-tight text-zinc-100 ${
            collapsed && !mobileOpen ? 'hidden' : ''
          }`}
        >
          MoneyMachine
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label={t('layout.toggleSidebar')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm text-zinc-400 transition hover:border-emerald-500/30 hover:bg-white/[0.06] hover:text-zinc-200"
        >
          {collapsed && !mobileOpen ? '→' : '←'}
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeId === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                  className={`relative flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.98] ${
                    isActive
                      ? "bg-emerald-500/[0.08] text-emerald-400 before:absolute before:left-0 before:top-1/2 before:h-[52%] before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-emerald-500 before:content-['']"
                      : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
                  }`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[17px] opacity-90">
                    <Icon />
                  </span>
                  {(!collapsed || mobileOpen) && (
                    <span className="truncate">{item.label}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-white/[0.08] p-4">
        {(!collapsed || mobileOpen) && (
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-zinc-300">
              {currentTenantName || 'POS'}
            </div>
            <div className="truncate text-xs text-zinc-600">Cashier</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar
