export interface Product {
  id: number | string
  code: string
  barcode?: string
  name: string
  description?: string
  price: number
  stock: number
  cost?: number
  category?: string
  image_url?: string
  minimum_stock?: number
  last_sale_date?: string
  supplier?: string
  [key: string]: unknown
}

export type MovementType = 'entrada' | 'salida'

export type EntradaMotivo = 'compra' | 'ajuste_manual' | 'devolucion' | 'otro'
export type SalidaMotivo = 'merma_dano' | 'ajuste_manual' | 'consumo_interno' | 'robo_perdida' | 'otro'

export interface InventoryMovement {
  id: string
  productId: number | string
  type: MovementType
  quantity: number
  motivo: string
  referencia?: string
  nota?: string
  fecha: string
  usuario?: string
  evidenceRef?: string
}

export interface PurchaseOrderItem {
  productId: number | string
  productName: string
  quantity: number
  suggestedSupplier?: string
}

export type StockStatus = 'OK' | 'BAJO' | 'SIN STOCK'

export interface ScanSessionItem {
  id: string
  productId?: number | string
  code: string
  name: string
  initialStock: number
  purchasePrice: number
  salePrice: number
  isNew: boolean
}
