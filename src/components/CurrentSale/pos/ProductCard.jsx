import React, { useCallback } from 'react'
import { FaExclamationTriangle } from 'react-icons/fa'
import { useProductImageSrcWithSignedFallback } from '../../../hooks/useProductImageSrcWithSignedFallback'

const LOW = 5

function stockLevel(product) {
  if (typeof product.stock !== 'number') return 'ok'
  if (product.stock === 0) return 'none'
  if (product.stock <= LOW) return 'low'
  return 'ok'
}

export function ProductCard({ product, onAdd, justAdded }) {
  const level = stockLevel(product)
  const noStock = typeof product.stock === 'number' && product.stock === 0
  const bump = justAdded === product.id
  const { src: imageSrc, showImage, onImgError } = useProductImageSrcWithSignedFallback(product)

  const activate = useCallback(() => onAdd(product), [onAdd, product])
  const onKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        activate()
      }
    },
    [activate]
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={onKeyDown}
      className={`pos-sale-product-card group flex w-full cursor-pointer flex-col rounded-2xl border border-[rgb(82_196_138/0.14)] pb-2 text-left transition-[box-shadow,border-color,background-color] duration-200 ease-out select-none max-lg:overflow-visible max-lg:active:scale-[0.98] max-lg:self-start lg:h-auto lg:min-h-[96px] lg:overflow-hidden lg:flex-row lg:items-stretch lg:self-start lg:pb-3 ${
        bump
          ? 'max-lg:scale-[1.01] border-[rgb(82_196_138/0.55)] bg-[rgb(20_30_27/0.95)] shadow-[0_8px_28px_-6px_rgba(82,196,138,0.35)] ring-2 ring-inset ring-[rgb(82_196_138/0.35)]'
          : 'bg-[rgb(20_30_27/0.55)] hover:border-[rgb(82_196_138/0.28)] hover:bg-[rgb(25_38_33/0.85)]'
      } ${noStock ? 'opacity-70' : ''}`}
    >
      {/* Móvil: altura fija vía CSS (.pos-sale-product-card__media). Escritorio: columna izquierda estira a la altura de la fila (evita hueco bajo la imagen) */}
      <div className="pos-sale-product-card__media relative w-full shrink-0 overflow-hidden rounded-t-2xl bg-[var(--pos-bg-deep)] lg:rounded-none lg:rounded-l-2xl lg:min-h-[96px] lg:w-[104px] lg:min-w-[104px] lg:max-w-[104px] lg:self-stretch">
        {showImage ? (
          <img
            key={imageSrc}
            src={imageSrc}
            alt=""
            className="h-full w-full object-cover transition duration-300 max-lg:group-hover:scale-[1.03] lg:group-hover:scale-100"
            loading="lazy"
            decoding="async"
            onError={onImgError}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a2822] to-[var(--pos-bg-deep)] text-lg font-bold tracking-wide text-[var(--pos-text-dim)] lg:text-xl">
            {(product.name || '?').slice(0, 2).toUpperCase()}
          </div>
        )}
        {level === 'low' && !noStock && (
          <span className="absolute left-1.5 top-1.5 rounded-md bg-amber-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-100">
            Low
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5 px-2.5 pb-0 pt-2.5 max-lg:flex-none lg:min-h-0 lg:flex-1 lg:justify-between lg:gap-2 lg:px-2.5 lg:py-3.5 lg:pl-4 lg:pr-3">
        <div className="min-w-0 max-lg:flex-none lg:min-h-0 lg:flex-1">
          <p className="line-clamp-2 text-left text-[12px] font-semibold leading-[1.25] text-[var(--pos-text)] lg:line-clamp-3 lg:text-sm lg:leading-snug">
            {noStock && (
              <FaExclamationTriangle className="mr-0.5 inline-block shrink-0 align-[-0.125em] text-amber-500" aria-hidden />
            )}
            {product.name}
          </p>
          {product.code ? (
            <p className="mt-1 hidden truncate text-left text-[11px] text-[var(--pos-text-muted)] lg:block">{product.code}</p>
          ) : null}
        </div>
        <div className="pos-sale-product-card__footer mt-1 flex shrink-0 items-center justify-between gap-2 border-t border-[rgb(82_196_138/0.12)] pt-2 pb-0 lg:mt-0 lg:pb-2">
          <span className="text-sm font-bold tabular-nums text-[var(--pos-text)] lg:text-lg">
            ${Number(product.price || 0).toFixed(2)}
          </span>
          <span className="rounded-lg bg-[rgb(82_196_138/0.12)] px-2 py-1 text-[11px] font-semibold text-[var(--pos-accent)] transition group-hover:bg-[rgb(82_196_138/0.2)] max-lg:min-w-[2rem] max-lg:text-center max-lg:text-sm max-lg:font-bold lg:px-2.5">
            <span className="lg:hidden" aria-hidden>
              +
            </span>
            <span className="hidden lg:inline">Agregar</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
