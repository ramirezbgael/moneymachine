import type { InventoryMovement } from '../types/inventory'

export const mockMovements: InventoryMovement[] = [
  {
    id: 'mov-1',
    productId: 1,
    type: 'entrada',
    quantity: 50,
    motivo: 'compra',
    referencia: 'FAC-2024-001',
    fecha: new Date(Date.now() - 86400000 * 2).toISOString(),
    usuario: 'admin',
    evidenceRef: 'mock-file-1.pdf',
  },
  {
    id: 'mov-2',
    productId: 1,
    type: 'salida',
    quantity: 5,
    motivo: 'merma_dano',
    nota: 'Productos vencidos',
    fecha: new Date(Date.now() - 86400000).toISOString(),
    usuario: 'admin',
  },
]
