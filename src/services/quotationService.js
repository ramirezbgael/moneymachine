/**
 * Quotation Service
 * Handles quotation creation, storage, and retrieval
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTenantStore } from '../store/tenantStore'

/**
 * Generate unique quotation code
 */
const generateQuotationCode = () => {
  const date = new Date()
  const random = Math.floor(Math.random() * 10000)
  return `QUOTE-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${random}`
}

/**
 * Create a quotation from current sale items
 */
export const createQuotation = async (quotationData) => {
  const {
    items,
    subtotal,
    discount = 0,
    subtotalAfterDiscount,
    taxRate = 0,
    taxAmount = 0,
    total,
    userId = null
  } = quotationData

  if (!items || items.length === 0) {
    throw new Error('No items in quotation')
  }

  try {
    const quotationCode = generateQuotationCode()
    
    if (isSupabaseConfigured() && supabase) {
      const tenantId = useTenantStore.getState().currentTenantId
      if (!tenantId) throw new Error('No tenant selected. Please log in again.')
      const { data: quotation, error } = await supabase
        .from('quotations')
        .insert([{
          tenant_id: tenantId,
          quotation_code: quotationCode,
          items: items.map(item => ({
            product_id: item.product.id,
            product_name: item.product.name,
            product_code: item.product.code,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: item.subtotal
          })),
          subtotal,
          discount,
          subtotal_after_discount: subtotalAfterDiscount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          user_id: userId,
          status: 'active',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        }])
        .select()
        .single()

      if (error) throw error
      return quotation
    } else {
      // Mock mode: save to localStorage
      const quotation = {
        id: Date.now(),
        quotation_code: quotationCode,
        items: items.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          product_code: item.product.code,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.subtotal
        })),
        subtotal,
        discount,
        subtotal_after_discount: subtotalAfterDiscount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        user_id: userId,
        status: 'active',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }

      const savedQuotations = JSON.parse(localStorage.getItem('quotations') || '[]')
      savedQuotations.push(quotation)
      localStorage.setItem('quotations', JSON.stringify(savedQuotations))

      return quotation
    }
  } catch (error) {
    console.error('Error creating quotation:', error)
    throw new Error(error.message || 'Error creating quotation')
  }
}

/**
 * Get quotation by code
 */
export const getQuotationByCode = async (code) => {
  try {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('quotation_code', code)
        .eq('status', 'active')
        .single()

      if (error) throw error
      return data
    } else {
      // Mock mode
      const quotations = JSON.parse(localStorage.getItem('quotations') || '[]')
      return quotations.find(q => q.quotation_code === code && q.status === 'active')
    }
  } catch (error) {
    console.error('Error fetching quotation:', error)
    return null
  }
}

/**
 * Convert quotation to sale items
 */
export const quotationToSaleItems = async (quotationCode) => {
  const quotation = await getQuotationByCode(quotationCode)
  
  if (!quotation) {
    throw new Error('Quotation not found or expired')
  }

  // Import productService to get full product data
  const { productService } = await import('./productService')
  
  const items = []
  
  // Handle both JSONB (from Supabase) and array format
  const quotationItems = Array.isArray(quotation.items) 
    ? quotation.items 
    : (typeof quotation.items === 'string' ? JSON.parse(quotation.items) : quotation.items)
  
  for (const item of quotationItems) {
    // Get full product data
    const product = await productService.getById(item.product_id)
    
    if (product) {
      items.push({
        id: Date.now() + Math.random(),
        product,
        quantity: item.quantity,
        unitPrice: item.unit_price || item.unitPrice || product.price,
        subtotal: item.subtotal || (item.unit_price || item.unitPrice || product.price) * item.quantity
      })
    } else {
      // If product not found, create a minimal product object from stored data
      items.push({
        id: Date.now() + Math.random(),
        product: {
          id: item.product_id,
          code: item.product_code || 'N/A',
          name: item.product_name || 'Producto no encontrado',
          price: item.unit_price || item.unitPrice || 0,
          stock: 0
        },
        quantity: item.quantity,
        unitPrice: item.unit_price || item.unitPrice || 0,
        subtotal: item.subtotal || (item.unit_price || item.unitPrice || 0) * item.quantity
      })
    }
  }

  return {
    items,
    discount: quotation.discount || 0,
    quotationId: quotation.id
  }
}

export const quotationService = {
  createQuotation,
  getQuotationByCode,
  quotationToSaleItems
}
