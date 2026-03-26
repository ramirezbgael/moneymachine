import React, { useEffect, useState, useCallback } from 'react'
import { useSaleStore } from '../../store/saleStore'
import { productService } from '../../services/productService'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useProductImageSrcWithSignedFallback } from '../../hooks/useProductImageSrcWithSignedFallback'
import './FeaturedProducts.css'

function FeaturedThumb({ product }) {
  const { src, showImage, onImgError } = useProductImageSrcWithSignedFallback(product)
  if (!showImage) {
    return (
      <span className="featured-products__placeholder">
        {(product.name || '?').slice(0, 2).toUpperCase()}
      </span>
    )
  }
  return (
    <img
      key={src}
      src={src}
      alt=""
      className="featured-products__img"
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={onImgError}
    />
  )
}

/**
 * FeaturedProducts — strip of pinned product buttons for quick add.
 * Products with is_featured = true (or the first 8 if none are flagged)
 * show as 50×50 photo tiles. Tap/click adds 1 unit to the sale.
 */
const FeaturedProducts = ({ onProductAdd, className = '' }) => {
  const addItem = useSaleStore((s) => s.addItem)
  const [products, setProducts] = useState([])
  const [bumped, setBumped] = useState(null) // id of last tapped for animation

  const loadTopFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) return []

    const { data, error } = await supabase
      .from('sale_items')
      .select(`
        product_id,
        quantity,
        products (
          id,
          name,
          price,
          image_url,
          code
        )
      `)

    if (error) throw error

    const map = new Map()
    for (const item of data || []) {
      const product = item.products
      const productId = item.product_id || product?.id
      if (!productId || !product) continue

      if (!map.has(productId)) {
        map.set(productId, {
          ...product,
          soldQty: 0
        })
      }
      map.get(productId).soldQty += Number(item.quantity || 0)
    }

    return Array.from(map.values())
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 8)
  }, [])

  const loadTopFromLocalSales = useCallback(() => {
    try {
      const sales = JSON.parse(localStorage.getItem('sales') || '[]')
      const map = new Map()

      for (const sale of sales) {
        for (const item of sale.sale_items || []) {
          const product = item.product
          const productId = item.product_id || product?.id
          if (!productId || !product) continue

          if (!map.has(productId)) {
            map.set(productId, {
              ...product,
              soldQty: 0
            })
          }

          map.get(productId).soldQty += Number(item.quantity || 0)
        }
      }

      return Array.from(map.values())
        .sort((a, b) => b.soldQty - a.soldQty)
        .slice(0, 8)
    } catch (err) {
      console.error('FeaturedProducts: local sales parse failed', err)
      return []
    }
  }, [])

  const load = useCallback(async () => {
    try {
      let topProducts = []

      try {
        topProducts = await loadTopFromSupabase()
      } catch (err) {
        console.warn('FeaturedProducts: Supabase top sellers not available, trying local history.', err)
      }

      if (!topProducts.length) {
        topProducts = loadTopFromLocalSales()
      }

      if (!topProducts.length) {
        const all = await productService.getAll()
        topProducts = all.slice(0, 8)
      }

      setProducts(topProducts)
    } catch (err) {
      console.error('FeaturedProducts: could not load products', err)
    }
  }, [loadTopFromLocalSales, loadTopFromSupabase])

  useEffect(() => {
    load()
  }, [load])

  const handleTap = (product) => {
    if (onProductAdd) onProductAdd(product)
    else addItem(product, 1)
    setBumped(product.id)
    setTimeout(() => setBumped(null), 220)
  }

  if (products.length === 0) return null

  return (
    <div className={`featured-products ${className}`.trim()} aria-label="Productos destacados">
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          className={`featured-products__tile${bumped === product.id ? ' featured-products__tile--bump' : ''}`}
          onClick={() => handleTap(product)}
          title={`${product.name}  $${Number(product.price || 0).toFixed(2)}`}
        >
          <FeaturedThumb product={product} />
          <span className="featured-products__name">{product.name}</span>
          <span className="featured-products__price">${Number(product.price || 0).toFixed(2)}</span>
        </button>
      ))}
    </div>
  )
}

export default FeaturedProducts
