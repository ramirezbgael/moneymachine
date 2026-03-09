import { create } from 'zustand'
import type { Product, InventoryMovement, PurchaseOrderItem, ScanSessionItem } from '../types/inventory'
import { productService } from '../services/productService'
import { offlineProductService } from '../services/offlineProductService'
import { mockMovements } from '../mock/mockMovements'

interface InventoryState {
  products: Product[]
  inventoryMovements: InventoryMovement[]
  purchaseOrders: PurchaseOrderItem[]
  selectedProduct: Product | null
  loading: boolean
  error: string | null

  scanSessionProducts: ScanSessionItem[]
  lastScannedCode: string | null
  voiceEnabled: boolean
  scanModeActive: boolean

  fetchProducts: () => Promise<void>
  setSelectedProduct: (p: Product | null) => void
  addMovement: (mov: Omit<InventoryMovement, 'id' | 'fecha'>) => void
  addToPurchaseOrder: (item: PurchaseOrderItem) => void
  updatePurchaseOrderQuantity: (productId: number | string, quantity: number) => void
  removeFromPurchaseOrder: (productId: number | string) => void
  clearPurchaseOrder: () => void
  incrementStock: (productId: number | string, quantity: number, movementPayload: Omit<InventoryMovement, 'id' | 'productId' | 'type' | 'quantity' | 'fecha'>) => Promise<void>
  decrementStock: (productId: number | string, quantity: number, movementPayload: Omit<InventoryMovement, 'id' | 'productId' | 'type' | 'quantity' | 'fecha'>) => Promise<void>
  createProduct: (productData: Partial<Product> & { name: string; code: string; price: number }) => Promise<Product>
  updateProduct: (productId: number | string, productData: Partial<Product>) => Promise<Product>
  deleteProduct: (productId: number | string) => Promise<void>

  addScanSessionItem: (item: ScanSessionItem) => void
  saveScanSession: () => Promise<void>
  clearScanSession: () => void
  setLastScannedCode: (code: string | null) => void
  setVoiceEnabled: (enabled: boolean) => void
  setScanModeActive: (active: boolean) => void
}

let movementId = 1000

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  inventoryMovements: [...mockMovements],
  purchaseOrders: [],
  selectedProduct: null,
  loading: false,
  error: null,
  scanSessionProducts: [],
  lastScannedCode: null,
  voiceEnabled: false,
  scanModeActive: false,

  fetchProducts: async () => {
    set({ loading: true, error: null })
    try {
      const products = await offlineProductService.getAll()
      set({ products: products || [], loading: false })
    } catch (e) {
      set({ products: [], loading: false, error: (e as Error).message })
    }
  },

  setSelectedProduct: (selectedProduct) => set({ selectedProduct }),

  addMovement: (mov) => {
    const newMov: InventoryMovement = {
      ...mov,
      id: `mov-${movementId++}`,
      fecha: new Date().toISOString(),
    }
    set((s) => ({ inventoryMovements: [newMov, ...s.inventoryMovements] }))
  },

  addToPurchaseOrder: (item) => {
    set((s) => {
      const existing = s.purchaseOrders.find((o) => o.productId === item.productId)
      if (existing) {
        return {
          purchaseOrders: s.purchaseOrders.map((o) =>
            o.productId === item.productId
              ? { ...o, quantity: o.quantity + item.quantity }
              : o
          ),
        }
      }
      return { purchaseOrders: [...s.purchaseOrders, item] }
    })
  },

  updatePurchaseOrderQuantity: (productId, quantity) => {
    set((s) => ({
      purchaseOrders: s.purchaseOrders.map((o) =>
        o.productId === productId ? { ...o, quantity } : o
      ),
    }))
  },

  removeFromPurchaseOrder: (productId) => {
    set((s) => ({
      purchaseOrders: s.purchaseOrders.filter((o) => o.productId !== productId),
    }))
  },

  clearPurchaseOrder: () => set({ purchaseOrders: [] }),

  incrementStock: async (productId, quantity, payload) => {
    const { products, addMovement } = get()
    const product = products.find((p) => p.id === productId)
    if (!product) return
    const newStock = (product.stock || 0) + quantity
    try {
      await offlineProductService.update(productId, { ...product, stock: newStock })
      addMovement({
        productId,
        type: 'entrada',
        quantity,
        motivo: payload.motivo,
        referencia: payload.referencia,
        nota: payload.nota,
        usuario: payload.usuario,
        evidenceRef: payload.evidenceRef,
      })
      set((s) => ({
        products: s.products.map((p) =>
          p.id === productId ? { ...p, stock: newStock } : p
        ),
      }))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  decrementStock: async (productId, quantity, payload) => {
    const { products, addMovement } = get()
    const product = products.find((p) => p.id === productId)
    if (!product) return
    const newStock = Math.max(0, (product.stock || 0) - quantity)
    try {
      await offlineProductService.update(productId, { ...product, stock: newStock })
      addMovement({
        productId,
        type: 'salida',
        quantity,
        motivo: payload.motivo,
        nota: payload.nota,
        usuario: payload.usuario,
      })
      set((s) => ({
        products: s.products.map((p) =>
          p.id === productId ? { ...p, stock: newStock } : p
        ),
      }))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  createProduct: async (productData) => {
    const created = await offlineProductService.create(productData as Parameters<typeof offlineProductService.create>[0])
    set((s) => ({ products: [...s.products, created as Product] }))
    return created as Product
  },
  updateProduct: async (productId, productData) => {
    const updated = await offlineProductService.update(productId, productData as Parameters<typeof offlineProductService.update>[1])
    set((s) => ({
      products: s.products.map((p) => (p.id === productId ? (updated as Product) : p)),
      selectedProduct: s.selectedProduct?.id === productId ? (updated as Product) : s.selectedProduct,
    }))
    return updated as Product
  },
  deleteProduct: async (productId) => {
    await offlineProductService.delete(productId)
    set((s) => ({
      products: s.products.filter((p) => p.id !== productId),
      selectedProduct: s.selectedProduct?.id === productId ? null : s.selectedProduct,
    }))
  },

  addScanSessionItem: (item) =>
    set((s) => ({
      scanSessionProducts: [item, ...s.scanSessionProducts],
    })),

  saveScanSession: async () => {
    const { scanSessionProducts, createProduct, incrementStock, fetchProducts } = get()
    if (scanSessionProducts.length === 0) return

    try {
      set({ loading: true, error: null })
      
      for (const item of scanSessionProducts) {
        if (item.isNew) {
          // Create new product
          await createProduct({
            name: item.name,
            code: item.code,
            price: item.salePrice,
            cost: item.purchasePrice,
            stock: item.initialStock,
          })
        } else if (item.productId && item.initialStock > 0) {
          // Update stock for existing product
          await incrementStock(item.productId, item.initialStock, {
            notes: `Registro masivo: ${item.name}`,
          })
        }
      }

      // Clear session after successful save
      set({
        scanSessionProducts: [],
        lastScannedCode: null,
        loading: false,
      })

      // Refresh products list
      await fetchProducts()
    } catch (err) {
      set({ 
        error: (err as Error)?.message || 'Error al guardar los productos',
        loading: false,
      })
      throw err
    }
  },

  clearScanSession: () =>
    set({
      scanSessionProducts: [],
      lastScannedCode: null,
    }),

  setLastScannedCode: (code) => set({ lastScannedCode: code }),
  setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
  setScanModeActive: (active) => set({ scanModeActive: active }),
}))
