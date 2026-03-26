import { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  resolveProductImageUrl,
  storageObjectPathForProductImages,
  PRODUCT_IMAGES_BUCKET,
} from '../utils/productImageUrl'

/**
 * Storage: las URLs públicas suelen fallar en <img> si el bucket es privado.
 * Orden: URL firmada (createSignedUrl); si falla, URL pública del SDK (getPublicUrl).
 */
export function useProductImageSrcWithSignedFallback(product) {
  const resolved = useMemo(
    () => resolveProductImageUrl(product),
    [product?.image_url, product?.image, product?.id]
  )
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)

  useLayoutEffect(() => {
    setFailed(false)

    if (!resolved) {
      setSrc(null)
      return
    }
    if (resolved.startsWith('data:') || resolved.startsWith('blob:')) {
      setSrc(resolved)
      return
    }

    const path = storageObjectPathForProductImages(product)
    if (!path || !isSupabaseConfigured() || !supabase) {
      setSrc(resolved)
      return
    }

    setSrc(null)
  }, [resolved, product?.id, product?.image_url, product?.image])

  useEffect(() => {
    if (!resolved || resolved.startsWith('data:') || resolved.startsWith('blob:')) {
      return undefined
    }

    const path = storageObjectPathForProductImages(product)
    if (!path || !isSupabaseConfigured() || !supabase) {
      return undefined
    }

    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .createSignedUrl(path, 3600)

        if (cancelled) return

        if (!error && data?.signedUrl) {
          setFailed(false)
          setSrc(data.signedUrl)
          return
        }

        if (import.meta.env.DEV && error) {
          console.warn('[product image] createSignedUrl', PRODUCT_IMAGES_BUCKET, path, error.message)
        }

        const { data: pub } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path)
        if (pub?.publicUrl) {
          setFailed(false)
          setSrc(pub.publicUrl)
          return
        }

        setFailed(false)
        setSrc(resolved)
      } catch (e) {
        if (cancelled) return
        if (import.meta.env.DEV) {
          console.warn('[product image] storage URL', PRODUCT_IMAGES_BUCKET, path, e)
        }
        try {
          const { data: pub } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path)
          if (pub?.publicUrl) {
            setFailed(false)
            setSrc(pub.publicUrl)
            return
          }
        } catch {
          /* noop */
        }
        setFailed(false)
        setSrc(resolved)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [resolved, product?.id, product?.image_url, product?.image])

  useEffect(() => {
    setFailed(false)
  }, [src])

  const onImgError = useCallback(() => {
    setFailed(true)
  }, [])

  const showImage = Boolean(src) && !failed
  return { src, showImage, onImgError }
}
