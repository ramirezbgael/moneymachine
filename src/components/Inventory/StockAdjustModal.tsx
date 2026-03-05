import React, { useState } from 'react'
import type { EntradaMotivo, SalidaMotivo } from '../../types/inventory'
import { LiquidButton } from './LiquidButton'

type Mode = 'entrada' | 'salida'

const ENTRADA_MOTIVOS: { value: EntradaMotivo; label: string }[] = [
  { value: 'compra', label: 'Compra' },
  { value: 'ajuste_manual', label: 'Ajuste manual' },
  { value: 'devolucion', label: 'Devolución' },
  { value: 'otro', label: 'Otro' },
]

const SALIDA_MOTIVOS: { value: SalidaMotivo; label: string }[] = [
  { value: 'merma_dano', label: 'Merma / daño' },
  { value: 'ajuste_manual', label: 'Ajuste manual' },
  { value: 'consumo_interno', label: 'Consumo interno' },
  { value: 'robo_perdida', label: 'Robo / pérdida' },
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
  const [referencia, setReferencia] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const isEntrada = mode === 'entrada'
  const motivos = isEntrada ? ENTRADA_MOTIVOS : SALIDA_MOTIVOS
  const qty = parseInt(quantity, 10)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!quantity || isNaN(qty) || qty <= 0) {
      setError('Ingresa una cantidad válida.')
      return
    }
    if (isEntrada) {
      if (!evidenceFile) {
        setError('Debes adjuntar factura (PDF) o foto de ticket/nota.')
        return
      }
      if (motivo === 'compra' && !referencia.trim()) {
        setError('Número de factura/nota es requerido cuando el motivo es Compra.')
        return
      }
    } else {
      if (!nota.trim()) {
        setError('La nota/comentario es obligatoria.')
        return
      }
    }
    onConfirm({
      quantity: qty,
      motivo,
      nota: nota || undefined,
      referencia: referencia || undefined,
      proveedor: proveedor || undefined,
      fecha,
      evidenceRef: evidenceFile ? `mock://${evidenceFile.name}` : undefined,
    })
    onClose()
  }

  const title = isEntrada ? 'Entrada de inventario' : 'Salida de inventario'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 md:bg-black/80 backdrop-blur-sm p-0 md:p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-md md:rounded-3xl bg-[var(--panel)] border-0 md:border border-[var(--border)] shadow-[var(--shadow)] p-6 md:p-7 max-h-[100vh] md:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-[var(--text)] mb-1">{title}</h2>
        <p className="text-[var(--muted)] text-sm mb-6">{productName}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">
              Cantidad a {isEntrada ? 'agregar' : 'disminuir'}
            </label>
            <input
              type="number"
              min="1"
              max={isEntrada ? undefined : currentStock}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5 md:py-3 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-base md:text-sm"
              placeholder="0"
              required
            />
            {!isEntrada && currentStock < 999 && (
              <p className="text-xs text-[var(--muted)] mt-1">Máximo: {currentStock}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Motivo</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as EntradaMotivo | SalidaMotivo)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5 md:py-3 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-base md:text-sm"
            >
              {motivos.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {isEntrada && (
            <>
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">
                  Factura (PDF) o foto de ticket / nota <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 md:py-2.5 text-[var(--text)] text-sm md:text-base file:mr-2 file:rounded-xl file:border-0 file:bg-[var(--accent-soft)] file:px-3 file:py-1.5 file:text-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Proveedor (opcional)</label>
                <input
                  type="text"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5 md:py-3 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-base md:text-sm"
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">
                  Número de factura / nota {motivo === 'compra' && <span className="text-[var(--danger)]">*</span>}
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5 md:py-3 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-base md:text-sm"
                  placeholder="FAC-2024-001"
                />
              </div>
            </>
          )}

          {!isEntrada && (
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Nota / comentario <span className="text-[var(--danger)]">*</span></label>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5 md:py-3 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none resize-none text-base md:text-sm"
                placeholder="Justificación de la salida"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5 md:py-3 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-base md:text-sm"
            />
          </div>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <div className="flex flex-col md:flex-row gap-3 pt-2">
            <LiquidButton type="submit" className="flex-1 w-full md:w-auto">
              Confirmar
            </LiquidButton>
            <LiquidButton type="button" variant="secondary" onClick={onClose} className="w-full md:w-auto">
              Cancelar
            </LiquidButton>
          </div>
        </form>
      </div>
    </div>
  )
}
