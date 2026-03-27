/**
 * Sale service for processing and saving sales
 * Las ventas no descuentan inventario ni bloquean por falta de stock (solo registro de venta).
 */
/** Si en el futuro se desea enlazar inventario con ventas, poner en true y revisar refundSale. */
const ADJUST_STOCK_ON_SALE = false
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { productService } from './productService'
import { useTenantStore } from '../store/tenantStore'
import { useReportsStore } from '../store/reportsStore'
import { useAuthStore } from '../store/authStore'

/**
 * Generate sale number
 */
const generateSaleNumber = () => {
  const date = new Date()
  const random = Math.floor(Math.random() * 1000)
  return `SALE-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${random}`
}

const registerCashSaleMovement = async ({ saleNumber, total, paymentMethod, status, sessionId }) => {
  if (status !== 'completed' || paymentMethod !== 'cash' || !sessionId) return

  const { cashSession, registerCashMovement } = useReportsStore.getState()
  if (!cashSession?.id || cashSession.id !== sessionId) return

  await registerCashMovement({
    type: 'sale',
    description: `Venta ${saleNumber}`,
    amount: total
  })
}

/**
 * Process and save a sale (completed or pending)
 * - Opcionalmente valida y descuenta stock (ver ADJUST_STOCK_ON_SALE)
 * - Saves sale to database
 */
export const processSale = async (saleData) => {
  const {
    items,
    subtotal,
    discount = 0,
    total,
    paymentMethod,
    receiptType = 'ticket',
    customer = null,
    userId = null,
    registerId = null,
    sessionId = null,
    status = 'completed' // 'completed' or 'pending'
  } = saleData

  // Validate items
  if (!items || items.length === 0) {
    throw new Error('No items in sale')
  }

  if (ADJUST_STOCK_ON_SALE && status === 'completed') {
    for (const item of items) {
      if (typeof item.product.stock === 'number' && item.product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.product.name}. Available: ${item.product.stock}`)
      }
    }
  }

  try {
    const saleNumber = generateSaleNumber()
    
    if (isSupabaseConfigured() && supabase) {
      const tenantId = useTenantStore.getState().currentTenantId
      if (!tenantId) throw new Error('No tenant selected. Please log in again.')
      // 1. Create sale record
      const { data: saleRecord, error: saleError } = await supabase
        .from('sales')
        .insert([{
          business_id: tenantId,
          sale_number: saleNumber,
          subtotal,
          discount,
          total,
          payment_method: paymentMethod || null,
          receipt_type: receiptType,
          customer_id: customer?.id || null,
          user_id: userId,
          register_id: registerId,
          session_id: sessionId,
          status: status
        }])
        .select()
        .single()

      if (saleError) throw saleError

      // 2. Create sale items
      const saleItems = items.map(item => ({
        sale_id: saleRecord.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      if (ADJUST_STOCK_ON_SALE && status === 'completed') {
        for (const item of items) {
          const newStock = item.product.stock - item.quantity
          const { error: updateError } = await supabase
            .from('products')
            .update({
              stock: newStock,
              last_sale_date: new Date().toISOString()
            })
            .eq('id', item.product.id)

          if (updateError) {
            console.error(`Error updating stock for product ${item.product.id}:`, updateError)
          }
        }
      }

      const processedSale = {
        ...saleRecord,
        sale_number: saleNumber,
        items: items.map((item) => ({
          ...item,
          product: {
            ...item.product,
            stock: ADJUST_STOCK_ON_SALE && status === 'completed'
              ? item.product.stock - item.quantity
              : item.product.stock
          }
        }))
      }

      await registerCashSaleMovement({ saleNumber, total, paymentMethod, status, sessionId })

      return processedSale
    } else {
      if (ADJUST_STOCK_ON_SALE && status === 'completed') {
        for (const item of items) {
          const product = await productService.getById(item.product.id)
          if (product) {
            product.stock -= item.quantity
            product.last_sale_date = new Date().toISOString()
          }
        }
      }

      // Save to localStorage
      const mockSale = {
        id: Date.now(),
        sale_number: saleNumber,
        subtotal,
        discount,
        total,
        payment_method: paymentMethod || null,
        receipt_type: receiptType,
        customer_id: customer?.id || null,
        user_id: userId,
        register_id: registerId,
        session_id: sessionId,
        status: status,
        created_at: new Date().toISOString(),
        sale_items: items.map((item) => ({
          ...item,
          product_id: item.product.id,
          product: {
            ...item.product,
            stock:
              ADJUST_STOCK_ON_SALE && status === 'completed'
                ? item.product.stock - item.quantity
                : item.product.stock
          }
        }))
      }

      const savedSales = JSON.parse(localStorage.getItem('sales') || '[]')
      savedSales.push(mockSale)
      localStorage.setItem('sales', JSON.stringify(savedSales))

      await registerCashSaleMovement({ saleNumber, total, paymentMethod, status, sessionId })

      return mockSale
    }
  } catch (error) {
    console.error('Error processing sale:', error)
    throw new Error(error.message || 'Error processing sale. Please try again.')
  }
}

/**
 * Get sales history
 */
export const getSales = async (limit = 50) => {
  try {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            product:products (*)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    }

    // Mock fallback
    const savedSales = JSON.parse(localStorage.getItem('sales') || '[]')
    return savedSales.slice(0, limit).reverse()
  } catch (error) {
    console.error('Error getting sales:', error)
    return []
  }
}

const registerCashRefundMovement = async ({ saleNumber, total, paymentMethod, sessionId }) => {
  if (paymentMethod !== 'cash') return
  const numericTotal = Number(total || 0)
  if (numericTotal <= 0) return

  // Preferir la sesión activa del store; si está cerrada, usar la sesión original de la venta.
  const { cashSession, fetchXCut, fetchFinancialSummary, fetchCashMovements } = useReportsStore.getState()
  const targetSessionId = cashSession?.id || sessionId
  if (!targetSessionId) return

  const tenantId = useTenantStore.getState().currentTenantId
  const userId = useAuthStore.getState().user?.id || null

  // 'expense' → se RESTA del balance: balance = opening + ventas − gastos + ajustes
  const movementPayload = {
    session_id: targetSessionId,
    type: 'expense',
    description: `Reembolso venta ${saleNumber}`,
    amount: numericTotal,
    created_at: new Date().toISOString(),
    user_id: userId,
  }

  if (isSupabaseConfigured() && supabase && tenantId) {
    try {
      await supabase.from('cash_movements').insert({ business_id: tenantId, ...movementPayload })
      // Refrescar estado del store para que la UI refleje el egreso
      await fetchCashMovements(targetSessionId)
      await fetchXCut()
      await fetchFinancialSummary()
    } catch (e) {
      console.error('Error registrando movimiento de reembolso en Supabase:', e)
    }
    return
  }

  // Fallback mock / localStorage
  try {
    const CASH_KEY = 'finance:cash_movements'
    const stored = JSON.parse(localStorage.getItem(CASH_KEY) || '[]')
    stored.unshift({
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...movementPayload,
    })
    localStorage.setItem(CASH_KEY, JSON.stringify(stored))
    // Refrescar estado del store para que la UI refleje el egreso
    await fetchCashMovements(targetSessionId)
    await fetchXCut()
    await fetchFinancialSummary()
  } catch (e) {
    console.error('Error registrando movimiento de reembolso en localStorage:', e)
  }
}

export const cancelSale = async ({ saleId, userId }) => {
  if (!saleId) throw new Error('saleId es requerido')

  if (isSupabaseConfigured() && supabase) {
    const tenantId = useTenantStore.getState().currentTenantId
    if (!tenantId) throw new Error('No tenant selected. Please log in again.')

    const { data: sale, error } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .eq('business_id', tenantId)
      .single()

    if (error) throw error
    if (!sale) throw new Error('Venta no encontrada')

    if (sale.status !== 'pending') {
      throw new Error('Solo se pueden cancelar ventas pendientes')
    }

    const { error: updateError } = await supabase
      .from('sales')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        notes: sale.notes
          ? `${sale.notes} | Cancelado por usuario ${userId || 'N/A'}`
          : `Cancelado por usuario ${userId || 'N/A'}`
      })
      .eq('id', saleId)
      .eq('business_id', tenantId)

    if (updateError) throw updateError

    return { ...sale, status: 'cancelled' }
  }

  const savedSales = JSON.parse(localStorage.getItem('sales') || '[]')
  const idx = savedSales.findIndex((s) => s.id === saleId)
  if (idx === -1) throw new Error('Venta no encontrada (mock)')

  const sale = savedSales[idx]
  if (sale.status !== 'pending') {
    throw new Error('Solo se pueden cancelar ventas pendientes')
  }

  savedSales[idx] = {
    ...sale,
    status: 'cancelled',
    notes: sale.notes
      ? `${sale.notes} | Cancelado (mock)`
      : 'Cancelado (mock)'
  }

  localStorage.setItem('sales', JSON.stringify(savedSales))
  return savedSales[idx]
}

export const refundSale = async ({ saleId, userId }) => {
  if (!saleId) throw new Error('saleId es requerido')

  if (isSupabaseConfigured() && supabase) {
    const tenantId = useTenantStore.getState().currentTenantId
    if (!tenantId) throw new Error('No tenant selected. Please log in again.')

    const { data: sale, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (
          *,
          product:products (*)
        )
      `)
      .eq('id', saleId)
      .eq('business_id', tenantId)
      .single()

    if (error) throw error
    if (!sale) throw new Error('Venta no encontrada')

    if (sale.status !== 'completed') {
      throw new Error('Solo se pueden reembolsar ventas completadas')
    }

    const items = sale.sale_items || []

    if (ADJUST_STOCK_ON_SALE) {
      for (const item of items) {
        if (!item.product) continue
        const newStock = (item.product.stock || 0) + item.quantity

        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.product.id)

        if (updateError) {
          console.error(`Error revirtiendo stock producto ${item.product.id}:`, updateError)
        }
      }
    }

    const { error: updateSaleError } = await supabase
      .from('sales')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        notes: sale.notes
          ? `${sale.notes} | Reembolsado por usuario ${userId || 'N/A'}`
          : `Reembolsado por usuario ${userId || 'N/A'}`
      })
      .eq('id', saleId)
      .eq('business_id', tenantId)

    if (updateSaleError) throw updateSaleError

    await registerCashRefundMovement({
      saleNumber: sale.sale_number,
      total: sale.total,
      paymentMethod: sale.payment_method,
      sessionId: sale.session_id
    })

    return {
      ...sale,
      status: 'cancelled',
      sale_items: items.map((item) => ({
        ...item,
        product: {
          ...item.product,
          stock: ADJUST_STOCK_ON_SALE
            ? (item.product?.stock || 0) + item.quantity
            : item.product?.stock
        }
      }))
    }
  }

  const savedSales = JSON.parse(localStorage.getItem('sales') || '[]')
  const idx = savedSales.findIndex((s) => s.id === saleId)
  if (idx === -1) throw new Error('Venta no encontrada (mock)')

  const sale = savedSales[idx]
  if (sale.status !== 'completed') {
    throw new Error('Solo se pueden reembolsar ventas completadas')
  }

  if (ADJUST_STOCK_ON_SALE) {
    for (const item of sale.sale_items || []) {
      if (!item.product) continue
      item.product.stock = (item.product.stock || 0) + item.quantity
    }
  }

  savedSales[idx] = {
    ...sale,
    status: 'cancelled',
    notes: sale.notes
      ? `${sale.notes} | Reembolsado (mock)`
      : 'Reembolsado (mock)'
  }

  localStorage.setItem('sales', JSON.stringify(savedSales))
  return savedSales[idx]
}

export const saleService = {
  processSale,
  getSales,
  cancelSale,
  refundSale
}
