/**
 * Bucket de Storage para fotos de producto (debe coincidir con imageService / Supabase).
 * Si en el dashboard el bucket tiene otro id, define VITE_PRODUCT_IMAGES_BUCKET en .env
 */
const rawBucket =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_PRODUCT_IMAGES_BUCKET
    ? String(import.meta.env.VITE_PRODUCT_IMAGES_BUCKET).trim()
    : ''
export const PRODUCT_IMAGES_BUCKET = rawBucket || 'product-images'

/**
 * URL pública para mostrar imagen de producto (image_url, image legacy, rutas Storage).
 */
export function resolveProductImageUrl(product) {
  const raw = product?.image_url ?? product?.image
  if (raw == null || typeof raw !== 'string') return null
  const u = raw.trim()
  if (!u) return null
  if (u.startsWith('//')) return `https:${u}`
  if (u.startsWith('http') || u.startsWith('data:') || u.startsWith('blob:')) return u
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base) return u
  const root = base.replace(/\/$/, '')
  if (u.startsWith('/storage/v1/')) return `${root}${u}`
  if (u.startsWith('storage/v1/')) return `${root}/${u}`
  if (u.startsWith('/storage/')) return `${root}${u}`
  const path = u.replace(/^\//, '')
  const bucket = PRODUCT_IMAGES_BUCKET
  if (path.startsWith(`${bucket}/`)) return `${root}/storage/v1/object/public/${path}`
  return `${root}/storage/v1/object/public/${bucket}/${path}`
}

/**
 * Ruta del objeto dentro del bucket a partir de una URL de Storage (cualquier variante).
 */
export function extractProductImagesStoragePath(resolvedUrl) {
  if (!resolvedUrl || typeof resolvedUrl !== 'string') return null
  if (resolvedUrl.startsWith('data:') || resolvedUrl.startsWith('blob:')) return null

  const bucket = PRODUCT_IMAGES_BUCKET

  try {
    const trimmed = resolvedUrl.trim()
    const u = new URL(trimmed)
    const pathname = u.pathname

    const prefixes = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/authenticated/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
    ]

    for (const prefix of prefixes) {
      if (pathname.startsWith(prefix)) {
        const rest = pathname.slice(prefix.length)
        const decoded = decodeURIComponent(rest || '')
        return decoded || null
      }
    }
  } catch {
    // URL relativa o inválida: intentar marcadores por string (legacy)
    const legacyPublic = `/storage/v1/object/public/${bucket}/`
    const legacyAuth = `/storage/v1/object/authenticated/${bucket}/`
    for (const marker of [legacyPublic, legacyAuth]) {
      const i = resolvedUrl.indexOf(marker)
      if (i !== -1) {
        const rest = resolvedUrl.slice(i + marker.length)
        const decoded = decodeURIComponent(rest.split('?')[0] || '').trim()
        return decoded || null
      }
    }
  }

  return null
}

/**
 * Ruta del objeto dentro del bucket para firmar URLs.
 */
export function storageObjectPathForProductImages(product) {
  const raw = product?.image_url ?? product?.image
  if (raw == null || typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t || t.startsWith('data:') || t.startsWith('blob:')) return null

  const bucket = PRODUCT_IMAGES_BUCKET

  if (t.startsWith('http') || t.startsWith('//')) {
    const abs = t.startsWith('//') ? `https:${t}` : t
    const fromDirect = extractProductImagesStoragePath(abs)
    if (fromDirect) return fromDirect
  }

  const resolved = resolveProductImageUrl(product)
  if (resolved) {
    const fromUrl = extractProductImagesStoragePath(resolved)
    if (fromUrl) return fromUrl
  }

  const path = t.replace(/^\//, '')
  if (!path || path.startsWith('http')) return null

  const withoutBucket = path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path
  return withoutBucket || null
}
