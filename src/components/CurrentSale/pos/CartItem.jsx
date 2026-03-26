import React from 'react'
import { FaExclamationTriangle } from 'react-icons/fa'

export function CartItem({
  item,
  t,
  touchFriendly = false,
  onIncrement,
  onDecrement,
  onRemove,
  isSelected,
  onSelect
}) {
  const stock = item.product?.stock
  const noStock = typeof stock === 'number' && (stock === 0 || item.quantity > stock)

  return (
    <div
      role="row"
      onClick={onSelect}
      className={`rounded-xl border px-3 py-2.5 transition-[transform,box-shadow,border-color] duration-200 ${
        isSelected
          ? 'border-[rgb(82_196_138/0.22)] bg-[rgb(82_196_138/0.08)]'
          : 'border-transparent bg-[rgb(20_30_27/0.4)] hover:border-[rgb(82_196_138/0.12)]'
      }`}
    >
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-medium leading-snug text-[var(--pos-text)]">
            {noStock && (
              <FaExclamationTriangle
                className="mr-1 inline-block shrink-0 text-amber-500/90"
                title={t('itemsList.noStock')}
              />
            )}
            {item.product?.name}
          </div>
          <div className="mt-0.5 text-xs tabular-nums text-[var(--pos-text-muted)]">
            ${item.unitPrice.toFixed(2)} × {item.quantity}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-sm font-semibold tabular-nums text-zinc-200">
            ${item.subtotal.toFixed(2)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t('itemsList.decreaseQuantity')}
              onClick={(e) => {
                e.stopPropagation()
                onDecrement(item.id)
              }}
              className={`flex items-center justify-center rounded-lg border border-[var(--pos-border-subtle)] bg-[var(--pos-bg-deep)] text-[var(--pos-text-muted)] transition hover:bg-[rgb(25_38_33/0.9)] active:scale-95 ${
                touchFriendly ? 'h-11 min-h-[44px] w-11 min-w-[44px] text-lg font-semibold' : 'h-8 w-8'
              }`}
            >
              −
            </button>
            <span className="min-w-[1.5rem] text-center text-sm font-medium tabular-nums text-[var(--pos-text)]">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label={t('itemsList.increaseQuantity')}
              onClick={(e) => {
                e.stopPropagation()
                onIncrement(item.id)
              }}
              className={`flex items-center justify-center rounded-lg border border-[rgb(82_196_138/0.35)] bg-[rgb(82_196_138/0.1)] text-[var(--pos-accent)] transition hover:bg-[rgb(82_196_138/0.16)] active:scale-95 ${
                touchFriendly ? 'h-11 min-h-[44px] w-11 min-w-[44px] text-lg font-semibold' : 'h-8 w-8'
              }`}
            >
              +
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(item.id)
        }}
        className={`mt-2 font-medium text-[var(--pos-text-dim)] underline-offset-2 hover:text-[var(--pos-text-muted)] hover:underline active:opacity-80 ${
          touchFriendly ? 'min-h-[44px] py-2 text-left text-xs' : 'text-[11px]'
        }`}
      >
        {t('itemsList.removeItem')}
      </button>
    </div>
  )
}

export default CartItem
