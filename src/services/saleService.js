/**
 * Sale service for processing and saving sales
 * MVP: Supports stock validation and inventory decrement
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { productService } from './productService'
import { useTenantStore } from '../store/tenantStore'

/**
 * Generate sale number
 */
const generateSaleNumber = () => {
  const date = new Date()
  const random = Math.floor(Math.random() * 1000)
  return `SALE-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${random}`
}

/**
 * Process and save a sale (completed or pending)
 * - Validates stock availability (if completing)
 * - Saves sale to database
 * - Decrements product stock (if completing)
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
    status = 'completed' // 'completed' or 'pending'
  } = saleData

  // Validate items
  if (!items || items.length === 0) {
    throw new Error('No items in sale')
  }

  // Validate stock for all items before processing (only if completing)
  if (status === 'completed') {
    for (const item of items) {
      if (item.product.stock < item.quantity) {
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
          tenant_id: tenantId,
          sale_number: saleNumber,
          subtotal,
          discount,
          total,
          payment_method: paymentMethod || null,
          receipt_type: receiptType,
          customer_id: customer?.id || null,
          user_id: userId,
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

      // 3. Update product stock (only if completing)
      if (status === 'completed') {
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
            // Continue with other updates
          }
        }
      }

      return {
        ...saleRecord,
        sale_number: saleNumber,
        items: items.map(item => ({
          ...item,
          product: {
            ...item.product,
            stock: item.product.stock - item.quantity
          }
        }))
      }
    } else {
      // Mock mode: Update local product data (only if completing)
      if (status === 'completed') {
        for (const item of items) {
          // Update stock in mock data
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
        status: status,
        created_at: new Date().toISOString(),
        sale_items: items.map(item => ({
          ...item,
          product_id: item.product.id,
          product: {
            ...item.product,
            stock: status === 'completed' ? item.product.stock - item.quantity : item.product.stock
          }
        }))
      }

      const savedSales = JSON.parse(localStorage.getItem('sales') || '[]')
      savedSales.push(mockSale)
      localStorage.setItem('sales', JSON.stringify(savedSales))

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

export const saleService = {
  processSale,
  getSales
}
