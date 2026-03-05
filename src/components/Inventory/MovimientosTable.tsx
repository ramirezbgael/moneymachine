import React from 'react'
import type { InventoryMovement } from '../../types/inventory'
import { LiquidButton } from './LiquidButton'

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
    <div className="rounded-3xl bg-[rgba(15,15,15,0.6)] border border-white/10 backdrop-blur-sm overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white">Movimientos de inventario</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-4 text-white/70 font-medium text-sm">Fecha</th>
              <th className="p-4 text-white/70 font-medium text-sm">Tipo</th>
              <th className="p-4 text-white/70 font-medium text-sm">Cantidad</th>
              <th className="p-4 text-white/70 font-medium text-sm">Motivo</th>
              <th className="p-4 text-white/70 font-medium text-sm">Referencia</th>
              <th className="p-4 text-white/70 font-medium text-sm">Usuario</th>
              <th className="p-4 text-white/70 font-medium text-sm">Acción</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-white/50">
                  No hay movimientos
                </td>
              </tr>
            ) : (
              sorted.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="p-4 text-white/80 text-sm">
                    {new Date(m.fecha).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span
                      className={
                        m.type === 'entrada'
                          ? 'text-[#00ff88]'
                          : 'text-amber-400'
                      }
                    >
                      {m.type === 'entrada' ? 'Entrada' : 'Salida'}
                    </span>
                  </td>
                  <td className="p-4 text-white font-medium">{m.quantity}</td>
                  <td className="p-4 text-white/70 text-sm">{m.motivo}</td>
                  <td className="p-4 text-white/60 text-sm">{m.referencia || '—'}</td>
                  <td className="p-4 text-white/50 text-sm">{m.usuario || '—'}</td>
                  <td className="p-4">
                    <LiquidButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {}}
                    >
                      Ver detalle
                    </LiquidButton>
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
