import React, { useEffect, useRef, useState } from 'react'
import type { EntradaMotivo, SalidaMotivo } from '../../types/inventory'
import { LiquidButton } from './LiquidButton'

type Mode = 'entrada' | 'salida'

const ENTRADA_MOTIVOS: { value: EntradaMotivo; label: string }[] = [
  { value: 'compra', label: 'Compra' },
  { value: 'ajuste_manual', label: 'Ajuste manual' },
  { value: 'devolucion', label: 'Devolucion' },
  { value: 'otro', label: 'Otro' },
]

const SALIDA_MOTIVOS: { value: SalidaMotivo; label: string }[] = [
  { value: 'merma_dano', label: 'Merma / dano' },
  { value: 'ajuste_manual', label: 'Ajuste manual' },
  { value: 'consumo_interno', label: 'Consumo interno' },
  { value: 'robo_perdida', label: 'Robo / perdida' },
  { value: 'otro', label: 'Otro' },
]

interface StockAdjustModalProps {
  mode: Mode
  productName: string
  currentStock: number
  onConfirm: (payload: {
    quantity: number
    motivo: string
    nota?: string
    referencia?: string
    proveedor?: string
    fecha?: string
    evidenceRef?: string
  }) => void
  onClose: () => void
}

export function StockAdjustModal({
  mode,
  productName,
  currentStock,
  onConfirm,
  onClose,
}: StockAdjustModalProps) {
  const [quantity, setQuantity] = useState('')
  const [motivo, setMotivo] = useState<EntradaMotivo | SalidaMotivo>(
    mode === 'entrada' ? 'compra' : 'merma_dano'
  )
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const quantityInputRef = useRef<HTMLInputElement>(null)

  const isEntrada = mode === 'entrada'
  const motivos = isEntrada ? ENTRADA_MOTIVOS : SALIDA_MOTIVOS
  const qty = parseInt(quantity, 10)
  const quickQuantities = [1, 5, 10, 25]
  const nextStock = Number.isNaN(qty)
    ? currentStock
    : isEntrada
      ? currentStock + qty
      : currentStock - qty

  useEffect(() => {
    const timer = setTimeout(() => {
      quantityInputRef.current?.focus()
      quantityInputRef.current?.select()
    }, 0)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!quantity || Number.isNaN(qty) || qty <= 0) {
      setError('Ingresa una cantidad valida.')
      return
    }

    if (!isEntrada && qty > currentStock) {
      setError('No puedes descontar mas de lo que hay en stock.')
      return
    }

    onConfirm({
      quantity: qty,
      motivo,
      nota: nota.trim() || undefined,
    })
    onClose()
  }

  const title = isEntrada ? 'Agregar stock' : 'Descontar stock'
  const actionLabel = isEntrada ? 'Agregar' : 'Descontar'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 md:bg-black/80 backdrop-blur-sm p-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-auto rounded-3xl bg-[var(--panel)] border border-[var(--border)] shadow-[var(--shadow)] p-4 md:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1 text-xs text-[var(--muted)]">
            Stock actual: <span className="font-semibold text-[var(--text)]">{currentStock}</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text)] mt-3 mb-1">{title}</h2>
          <p className="text-[var(--muted)] text-sm">{productName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Cantidad</label>
            <input
              ref={quantityInputRef}
              type="number"
              min="1"
              max={isEntrada ? undefined : currentStock}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-base font-semibold"
              placeholder="Ej. 5"
              required
            />

            <div className="grid grid-cols-4 gap-1.5 mt-1.5">
              {quickQuantities.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuantity(String(n))}
                  className="rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1 text-xs font-medium text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors text-center"
                >
                  +{n}
                </button>
              ))}
            </div>

            <div className="mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-xs text-[var(--muted)]">
              Resultado: <span className="text-[var(--text)] font-medium">{currentStock}</span> -&gt;{' '}
              <span className={`font-semibold ${nextStock < 0 ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`}>
                {nextStock < 0 ? 0 : nextStock}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Motivo</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as EntradaMotivo | SalidaMotivo)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-xs"
            >
              {motivos.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Nota (opcional)</label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={1}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none resize-none text-xs"
              placeholder={isEntrada ? 'Ej. reposicion rapida' : 'Ej. merma por dano'}
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--danger)] rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <LiquidButton type="submit" className="flex-1">
              {actionLabel}
            </LiquidButton>
            <LiquidButton type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancelar
            </LiquidButton>
          </div>
        </form>
      </div>
    </div>
  )
}
