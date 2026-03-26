import React from 'react'
import { FaBars } from 'react-icons/fa6'

/**
 * Header móvil POS: menú (drawer) + título + Caja.
 */
export function PosMobileHeader({ title, subtitle, onOpenMenu, openMenuLabel, onCaja, cajaLabel }) {
  return (
    <header className="pos-mobile-header flex shrink-0 items-center gap-2 border-b border-[var(--pos-border-subtle)] bg-[var(--pos-bg-deep)]/95 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md">
      <button
        type="button"
        aria-label={openMenuLabel || 'Menú'}
        onClick={onOpenMenu}
        className="pos-mobile-hit flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--pos-border-subtle)] bg-[var(--pos-surface-raised)] text-[var(--pos-text)] transition hover:border-[rgb(82_196_138/0.35)] hover:bg-[rgb(82_196_138/0.08)] active:scale-[0.97]"
      >
        <FaBars className="text-lg text-[var(--pos-accent)]" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-[var(--pos-text)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="truncate text-xs text-[var(--pos-text-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {onCaja ? (
        <button
          type="button"
          onClick={onCaja}
          className="pos-mobile-hit shrink-0 rounded-xl border border-[var(--pos-border-subtle)] px-3 py-2.5 text-xs font-semibold text-[var(--pos-text-muted)] transition hover:border-[rgb(82_196_138/0.28)] hover:text-[var(--pos-accent-bright)] active:scale-[0.98]"
        >
          {cajaLabel}
        </button>
      ) : null}
    </header>
  )
}

/**
 * Tabs Productos / Carrito (solo &lt; lg).
 */
export function PosMobileTabs({ active, onChange, productsLabel, cartLabel, itemCount, tabsAriaLabel }) {
  return (
    <div
      className="pos-mobile-tabs flex shrink-0 gap-2 border-b border-[var(--pos-border-subtle)] bg-[var(--pos-surface)] px-3 py-1.5"
      role="tablist"
      aria-label={tabsAriaLabel || 'Vista'}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === 'products'}
        id="pos-tab-products"
        aria-controls="pos-panel-products"
        onClick={() => onChange('products')}
        className={`pos-mobile-tab pos-mobile-hit min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold transition active:scale-[0.99] ${
          active === 'products'
            ? 'bg-[rgb(82_196_138/0.18)] text-[var(--pos-accent-bright)] ring-1 ring-[rgb(82_196_138/0.35)]'
            : 'bg-[var(--pos-bg-deep)]/60 text-[var(--pos-text-muted)] hover:bg-[rgb(82_196_138/0.08)] hover:text-[var(--pos-text)]'
        }`}
      >
        {productsLabel}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'cart'}
        id="pos-tab-cart"
        aria-controls="pos-panel-cart"
        onClick={() => onChange('cart')}
        className={`pos-mobile-tab pos-mobile-hit relative min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold transition active:scale-[0.99] ${
          active === 'cart'
            ? 'bg-[rgb(82_196_138/0.18)] text-[var(--pos-accent-bright)] ring-1 ring-[rgb(82_196_138/0.35)]'
            : 'bg-[var(--pos-bg-deep)]/60 text-[var(--pos-text-muted)] hover:bg-[rgb(82_196_138/0.08)] hover:text-[var(--pos-text)]'
        }`}
      >
        <span className="flex items-center justify-center gap-2">
          {cartLabel}
          {itemCount > 0 ? (
            <span className="pos-mobile-tab-badge min-w-[1.25rem] rounded-full bg-[var(--pos-accent)] px-1.5 py-0.5 text-center text-[11px] font-bold text-[var(--pos-bg-deep)] tabular-nums">
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          ) : null}
        </span>
      </button>
    </div>
  )
}
