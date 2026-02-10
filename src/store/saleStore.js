import { create } from 'zustand'
import { useSettingsStore } from './settingsStore'

/**
 * Global state store for current sale
 * Manages sale items, totals, and sale state
 */
export const useSaleStore = create((set, get) => ({
  // Sale items array
  items: [],
  
  // Discount (can be percentage or fixed amount)
  discount: 0,
  discountType: 'percentage', // 'percentage' or 'amount'
  
  // Add item to sale
  addItem: (product, quantity = 1) => {
    if (!product) {
      console.error('❌ addItem: No product provided')
      return false
    }
    
    if (!product.id) {
      console.error('❌ addItem: Product missing id:', product)
      return false
    }
    
    console.log('➕ Adding item to sale:', product.name, product.code, 'quantity:', quantity)
    
    const { items } = get()
    
    // Allow add regardless of stock; UI shows semáforo + alert in list
    if (typeof product.stock === 'number' && product.stock < quantity) {
      console.warn('⚠️ Insufficient stock:', product.stock, '<', quantity)
    }
    
    const existingItemIndex = items.findIndex(
      item => item.product && item.product.id === product.id
    )
    
    if (existingItemIndex >= 0) {
      const newQuantity = items[existingItemIndex].quantity + quantity
      if (typeof product.stock === 'number' && product.stock < newQuantity) {
        console.warn('⚠️ Insufficient stock for update:', product.stock, '<', newQuantity)
      }
      // Update quantity if product already exists
      const newItems = [...items]
      newItems[existingItemIndex] = {
        ...newItems[existingItemIndex],
        quantity: newQuantity,
        subtotal: newItems[existingItemIndex].unitPrice * newQuantity
      }
      set({ items: newItems })
      console.log('✅ Item quantity updated:', newQuantity)
    } else {
      // Add new item
      const newItem = {
        id: Date.now() + Math.random(),
        product,
        quantity,
        unitPrice: product.price || 0,
        subtotal: (product.price || 0) * quantity
      }
      set({
        items: [
          ...items,
          newItem
        ]
      })
      console.log('✅ New item added to sale:', newItem)
    }
    return true
  },
  
  // Update item quantity
  updateItemQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(itemId)
      return true
    }
    
    const { items } = get()
    const item = items.find(i => i.id === itemId)
    
    if (item) {
      const newItems = items.map(i => {
        if (i.id === itemId) {
          return {
            ...i,
            quantity,
            subtotal: i.unitPrice * quantity
          }
        }
        return i
      })
      set({ items: newItems })
      return true
    }
    return false
  },
  
  // Increment item quantity
  incrementQuantity: (itemId) => {
    const { items } = get()
    const item = items.find(i => i.id === itemId)
    if (item) {
      get().updateItemQuantity(itemId, item.quantity + 1)
    }
  },
  
  // Decrement item quantity
  decrementQuantity: (itemId) => {
    const { items } = get()
    const item = items.find(i => i.id === itemId)
    if (item) {
      get().updateItemQuantity(itemId, item.quantity - 1)
    }
  },
  
  // Remove item from sale
  removeItem: (itemId) => {
    const { items } = get()
    set({ items: items.filter(item => item.id !== itemId) })
  },
  
  // Clear all items
  clearSale: () => {
    set({ items: [], discount: 0, discountType: 'percentage' })
  },

  // Load sale (for resuming pending sales)
  loadSale: (saleData) => {
    const items = saleData.items || saleData.sale_items || []
    const mappedItems = items.map(item => ({
      id: Date.now() + Math.random(),
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unit_price || item.unitPrice || item.product.price,
      subtotal: (item.unit_price || item.unitPrice || item.product.price) * item.quantity
    }))
    
    set({ 
      items: mappedItems,
      discount: saleData.discount || 0,
      discountType: 'percentage'
    })
  },
  
  // Set discount
  setDiscount: (value, type = 'percentage') => {
    set({ discount: value, discountType: type })
  },
  
  // Get totals
  getTotals: () => {
    const { items, discount, discountType } = get()
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    
    let discountAmount = 0
    if (discount > 0) {
      if (discountType === 'percentage') {
        discountAmount = (subtotal * discount) / 100
      } else {
        discountAmount = discount
      }
    }
    
    const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount)
    
    // Precios de venta ya incluyen impuesto; no sumar impuesto extra al total
    const taxRate = useSettingsStore.getState().taxRate || 0
    const taxAmount = 0
    const total = subtotalAfterDiscount
    
    return { itemCount, subtotal, discountAmount, subtotalAfterDiscount, taxRate, taxAmount, total }
  }
}))