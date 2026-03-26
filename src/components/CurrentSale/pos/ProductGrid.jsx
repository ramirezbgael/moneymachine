import React, { useMemo } from 'react'
import { ProductCard } from './ProductCard'

export function ProductGrid({ products, filter, onAddProduct, justAddedId, denseCards = true }) {
  const filtered = useMemo(() => {
    const q = (filter || '').trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => {
      const name = (p.name || '').toLowerCase()
      const code = (p.code || '').toLowerCase()
      const barcode = (p.barcode || '').toLowerCase()
      return name.includes(q) || code.includes(q) || barcode.includes(q)
    })
  }, [products, filter])

  if (!filtered.length) {
    return (
      <div className="pos-sale-catalog-empty flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center">
        <p className="pos-sale-catalog-empty-title text-sm font-medium">No hay productos que coincidan</p>
        <p className="pos-sale-catalog-empty-sub mt-1 max-w-sm text-xs leading-relaxed">
          Ajusta la búsqueda o escanea un código para agregar.
        </p>
      </div>
    )
  }

  return (
    <div
      className={`pos-sale-product-grid grid min-h-0 w-full min-w-0 flex-1 touch-pan-y grid-cols-2 content-start items-start gap-2 overflow-y-auto overflow-x-hidden pb-6 auto-rows-auto sm:gap-3 lg:gap-3 lg:pb-4 [scrollbar-gutter:stable] ${
        denseCards
          ? 'lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3'
          : ''
      }`}
    >
      {filtered.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAdd={onAddProduct}
          justAdded={justAddedId === product.id}
        />
      ))}
    </div>
  )
}

export default ProductGrid
