import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Zustand store for managing pending sales
 */
export const usePendingStore = create((set, get) => ({
  pendingSales: [],
  loading: false,
  error: null,

  /**
   * Fetch all pending sales from database
   */
  fetchPendingSales: async () => {
    set({ loading: true, error: null })
    
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
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        if (error) {
          console.warn('Supabase error fetching pending sales, using mock data:', error)
          set({ pendingSales: getMockPendingSales(), loading: false })
          return
        }

        set({ pendingSales: data || [], loading: false })
      } else {
        // Mock mode
        set({ pendingSales: getMockPendingSales(), loading: false })
      }
    } catch (error) {
      console.error('Error fetching pending sales:', error)
      set({ error: error.message, loading: false, pendingSales: getMockPendingSales() })
    }
  },

  /**
   * Mark a pending sale as paid (complete it)
   */
  markAsPaid: async (saleId, paymentMethod) => {
    try {
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase
          .from('sales')
          .update({ 
            status: 'completed',
            payment_method: paymentMethod,
            updated_at: new Date().toISOString()
          })
          .eq('id', saleId)

        if (error) throw error
      } else {
        // Mock mode: update in localStorage
        const mockSales = JSON.parse(localStorage.getItem('sales') || '[]')
        const saleIndex = mockSales.findIndex(s => s.id === saleId)
        if (saleIndex >= 0) {
          mockSales[saleIndex].status = 'completed'
          mockSales[saleIndex].payment_method = paymentMethod
          mockSales[saleIndex].updated_at = new Date().toISOString()
          localStorage.setItem('sales', JSON.stringify(mockSales))
        }
      }

      // Refresh pending sales list
      await get().fetchPendingSales()
      return true
    } catch (error) {
      console.error('Error marking sale as paid:', error)
      set({ error: error.message })
      return false
    }
  },

  /**
   * Cancel a pending sale and restore stock
   */
  cancelSale: async (sale) => {
    try {
      if (isSupabaseConfigured() && supabase) {
        // Update sale status
        const { error: saleError } = await supabase
          .from('sales')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', sale.id)

        if (saleError) throw saleError

        // Restore stock for each item
        for (const item of sale.sale_items || []) {
          const { error: stockError } = await supabase
            .from('products')
            .update({ 
              stock: supabase.rpc('increment', { 
                row_id: item.product_id, 
                increment_by: item.quantity 
              })
            })
            .eq('id', item.product_id)

          if (stockError) {
            console.error(`Error restoring stock for product ${item.product_id}:`, stockError)
          }
        }
      } else {
        // Mock mode
        const mockSales = JSON.parse(localStorage.getItem('sales') || '[]')
        const saleIndex = mockSales.findIndex(s => s.id === sale.id)
        if (saleIndex >= 0) {
          mockSales[saleIndex].status = 'cancelled'
          mockSales[saleIndex].updated_at = new Date().toISOString()
          localStorage.setItem('sales', JSON.stringify(mockSales))
        }

        // Restore mock product stock
        const { productService } = await import('../services/productService')
        for (const item of sale.sale_items || []) {
          const product = await productService.getById(item.product.id)
          if (product) {
            product.stock += item.quantity
          }
        }
      }

      // Refresh pending sales list
      await get().fetchPendingSales()
      return true
    } catch (error) {
      console.error('Error cancelling sale:', error)
      set({ error: error.message })
      return false
    }
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null })
}))

/**
 * Mock pending sales for testing
 */
const getMockPendingSales = () => {
  const mockSales = JSON.parse(localStorage.getItem('sales') || '[]')
  return mockSales.filter(s => s.status === 'pending')
}
