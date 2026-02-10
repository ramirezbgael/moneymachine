import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useInventoryStore } from '../../store/inventoryStore'
import { LiquidButton } from '../../components/inventory/LiquidButton'

export function PedidosInventarioPage() {
  const navigate = useNavigate()
  const { purchaseOrders, updatePurchaseOrderQuantity, removeFromPurchaseOrder, clearPurchaseOrder } =
    useInventoryStore()

  return (
    <div className="min-h-full bg-[#050505] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Pedido a proveedor</h1>
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white/80 hover:bg-white/10"
          >
            ← Volver al inventario
          </button>
        </div>

        <div className="rounded-3xl bg-[rgba(15,15,15,0.6)] border border-white/10 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-4 text-white/70 font-medium">Producto</th>
                  <th className="p-4 text-white/70 font-medium">Cantidad</th>
                  <th className="p-4 text-white/70 font-medium">Proveedor sugerido</th>
                  <th className="p-4 text-white/70 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-white/50">
                      No hay productos en el pedido. Usa &quot;Agregar al pedido&quot; en el
                      inventario.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((item) => (
                    <tr
                      key={item.productId}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 font-medium text-white">{item.productName}</td>
                      <td className="p-4">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updatePurchaseOrderQuantity(
                              item.productId,
                              parseInt(e.target.value, 10) || 1
                            )
                          }
                          className="w-20 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-white text-center focus:border-[#00ff88]/50 focus:outline-none"
                        />
                      </td>
                      <td className="p-4 text-white/70 text-sm">
                        {item.suggestedSupplier || '—'}
                      </td>
                      <td className="p-4">
                        <LiquidButton
                          variant="danger"
                          size="sm"
                          onClick={() => removeFromPurchaseOrder(item.productId)}
                        >
                          Quitar
                        </LiquidButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {purchaseOrders.length > 0 && (
          <div className="flex gap-3 mt-6">
            <LiquidButton onClick={() => {}}>Generar orden de compra</LiquidButton>
            <LiquidButton variant="secondary" onClick={() => {}}>
              Exportar PDF
            </LiquidButton>
            <LiquidButton variant="secondary" onClick={clearPurchaseOrder}>
              Vaciar lista
            </LiquidButton>
          </div>
        )}
      </div>
    </div>
  )
}
