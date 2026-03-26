import React from 'react'
import { FaUpload } from 'react-icons/fa'
import type { Product } from '../../types/inventory'
import { getProductIcon, IconPicker } from './ProductIcons'

export interface IdentityDraft {
  name: string
  code: string
  barcode: string
  description: string
  image_url: string
  icon: string
}

export interface ProductInfoProps {
  product: Product
  isEditing: boolean
  identityDraft: IdentityDraft
  onIdentityChange: (next: Partial<IdentityDraft>) => void
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function ProductInfo({
  product,
  isEditing,
  identityDraft,
  onIdentityChange,
  onImageUpload,
}: ProductInfoProps) {
  const displayImage = isEditing ? identityDraft.image_url : product.image_url
  const displayIcon = isEditing ? identityDraft.icon : (product as { icon?: string }).icon || 'box'
  const IconComp = getProductIcon(displayIcon)

  return (
    <section className="rounded-2xl bg-zinc-900/35 p-5 ring-1 ring-zinc-800/80">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Identidad</h2>

      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,140px),1fr] md:items-start">
        <div className="mx-auto flex aspect-square w-full max-w-[140px] items-center justify-center overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-zinc-800 md:mx-0">
          {displayImage ? (
            <img src={displayImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <IconComp className="h-14 w-14 text-zinc-600" />
          )}
        </div>

        <div className="min-w-0 space-y-4">
          {isEditing ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-500">Nombre</span>
                  <input
                    type="text"
                    value={identityDraft.name}
                    onChange={(e) => onIdentityChange({ name: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 shadow-sm shadow-black/20 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-500">SKU</span>
                  <input
                    type="text"
                    value={identityDraft.code}
                    onChange={(e) => onIdentityChange({ code: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-2 font-mono text-sm text-zinc-100 shadow-sm shadow-black/20 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-500">Código de barras</span>
                  <input
                    type="text"
                    value={identityDraft.barcode}
                    onChange={(e) => onIdentityChange({ barcode: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-2 font-mono text-sm text-zinc-100 shadow-sm shadow-black/20 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-500">Imagen</span>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-300 shadow-sm shadow-black/15 transition hover:border-zinc-600 hover:bg-zinc-800/50">
                    <FaUpload className="h-3.5 w-3.5" />
                    Subir imagen
                    <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
                  </label>
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-500">Descripción</span>
                <textarea
                  rows={3}
                  value={identityDraft.description}
                  onChange={(e) => onIdentityChange({ description: e.target.value })}
                  className="w-full resize-none rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 shadow-sm shadow-black/20 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                />
              </label>
              <div>
                <span className="mb-2 block text-xs font-medium text-zinc-500">Icono si no hay foto</span>
                <IconPicker
                  value={identityDraft.icon}
                  onChange={(iconId) => onIdentityChange({ icon: iconId })}
                />
              </div>
            </>
          ) : (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-zinc-600">Nombre</dt>
                <dd className="mt-0.5 font-medium text-zinc-100">{product.name}</dd>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-zinc-600">SKU</dt>
                  <dd className="mt-0.5 font-mono text-zinc-300">{product.code || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-600">Código de barras</dt>
                  <dd className="mt-0.5 font-mono text-zinc-300">{product.barcode || '—'}</dd>
                </div>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-600">Descripción</dt>
                <dd className="mt-0.5 leading-relaxed text-zinc-400">
                  {(product.description as string) || '—'}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </section>
  )
}
