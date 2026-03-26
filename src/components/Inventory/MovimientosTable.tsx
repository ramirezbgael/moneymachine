import React from 'react'
import type { InventoryMovement } from '../../types/inventory'

interface MovimientosTableProps {
  movements: InventoryMovement[]
  productId?: number | string
}

export function MovimientosTable({ movements, productId }: MovimientosTableProps) {
  const list = productId
    ? movements.filter((m) => m.productId === productId)
    : movements
  const sorted = [...list].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )

  return (
    <div className="overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
          Movimientos de inventario
        </h3>
      </div>
      <div className="overflow-x-auto bg-zinc-950 [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[640px] border-collapse bg-zinc-950 text-left">
          <thead className="bg-zinc-900">
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Fecha
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Tipo
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Cantidad
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Motivo
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Referencia
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Usuario
              </th>
              <th className="px-4 py-2.5 pr-5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="bg-zinc-950">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="bg-zinc-950 px-4 py-10 text-center text-sm text-zinc-500">
                  No hay movimientos
                </td>
              </tr>
            ) : (
              sorted.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-zinc-800/40 transition-colors last:border-0 hover:bg-zinc-800/25"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums text-zinc-300">
                    {new Date(m.fecha).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    {m.type === 'entrada' ? (
                      <span className="inline-flex rounded-md bg-emerald-500/12 px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/25">
                        Entrada
                      </span>
                    ) : (
                      <span className="inline-flex rounded-md bg-amber-500/12 px-2 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-amber-500/25">
                        Salida
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium tabular-nums text-zinc-200">
                    {m.quantity}
                  </td>
                  <td className="max-w-[140px] truncate px-4 py-2.5 text-sm text-zinc-400" title={m.motivo}>
                    {m.motivo}
                  </td>
                  <td className="max-w-[120px] truncate px-4 py-2.5 text-sm text-zinc-500">
                    {m.referencia || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-zinc-500">{m.usuario || '—'}</td>
                  <td className="px-4 py-2.5 pr-5 text-right">
                    <button
                      type="button"
                      onClick={() => {}}
                      className="inline-flex rounded-lg bg-zinc-800/90 px-3 py-1.5 text-xs font-medium text-zinc-300 ring-1 ring-zinc-700/80 transition hover:bg-zinc-700 hover:text-zinc-100"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
