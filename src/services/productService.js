/**
 * Product service
 * Handles product CRUD operations with Supabase or mock fallback
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTenantStore } from '../store/tenantStore'

// Mock products for development
const mockProducts = [
  {
    id: 1,
    code: 'COKE001',
    barcode: '7501234567890',
    name: 'Coca Cola 500ml',
    description: 'Refresco de cola',
    price: 15.00,
    stock: 50
  },
  {
    id: 2,
    code: 'CHIPS001',
    barcode: '7501234567891',
    name: 'Sabritas Original 100g',
    description: 'Papas fritas',
    price: 18.00,
    stock: 30
  },
  {
    id: 3,
    code: 'CANDY001',
    barcode: '7501234567892',
    name: 'Chicles Bubbaloo',
    description: 'Chicle de sabores',
    price: 3.00,
    stock: 100
  },
  {
    id: 4,
    code: 'WATER001',
    barcode: '7501234567893',
    name: 'Agua Ciel 1L',
    description: 'Agua purificada',
    price: 12.00,
    stock: 80
  },
  {
    id: 5,
    code: 'JUICE001',
    barcode: '7501234567894',
    name: 'Jugo Del Valle 500ml',
    description: 'Jugo de manzana',
    price: 14.00,
    stock: 25
  },
  {
    id: 6,
    code: 'BREAD001',
    barcode: '7501234567895',
    name: 'Pan Bimbo',
    description: 'Pan de caja',
    price: 35.00,
    stock: 15
  },
  {
    id: 7,
    code: 'MILK001',
    barcode: '7501234567896',
    name: 'Leche Lala 1L',
    description: 'Leche entera',
    price: 28.00,
    stock: 20
  },
  {
    id: 8,
    code: 'TIME001',
    barcode: 'TIME001',
    name: 'Internet 1 hora',
    description: 'Tiempo de computadora',
    price: 20.00,
    stock: 999
  },
  {
    id: 9,
    code: 'PRINT001',
    barcode: 'PRINT001',
    name: 'Impresión B/N',
    description: 'Impresión blanco y negro',
    price: 2.00,
    stock: 999
  },
  {
    id: 10,
    code: 'PHOTO001',
    barcode: 'PHOTO001',
    name: 'Fotos 4x6',
    description: 'Fotos tamaño postal',
    price: 5.00,
    stock: 999
  }
]

export const productService = {
  /**
   * Get all products
   */
  getAll: async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true })

        if (error) throw error
        return data || []
      } catch (error) {
        console.error('Supabase error, using mock data:', error)
        return mockProducts
      }
    }
    return mockProducts
  },

  /**
   * Get product by ID
   */
  getById: async (id) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        return data
      } catch (error) {
        console.error('Supabase error, using mock data:', error)
        return mockProducts.find(p => p.id === id)
      }
    }
    return mockProducts.find(p => p.id === id)
  },

  /**
   * Find product by code or barcode
   */
  findByCode: async (code) => {
    if (!code || typeof code !== 'string') {
      console.warn('findByCode: Invalid code provided', code)
      return null
    }
    
    // Trim and normalize the code
    const normalizedCode = code.trim().toUpperCase()
    console.log('🔍 Searching for product with code:', normalizedCode)
    
    if (isSupabaseConfigured() && supabase) {
      try {
        // Try exact match first (case-insensitive)
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .or(`code.ilike.${normalizedCode},barcode.ilike.${normalizedCode}`)
          .maybeSingle() // Use maybeSingle instead of single to avoid errors when not found

        if (error) {
          console.error('Supabase query error:', error)
          throw error
        }
        
        if (data) {
          console.log('✅ Product found:', data.name, data.code)
          return data
        }
        
        // If not found with ilike, try exact match
        const { data: exactData, error: exactError } = await supabase
          .from('products')
          .select('*')
          .or(`code.eq.${code},barcode.eq.${code}`)
          .maybeSingle()
        
        if (exactError) {
          console.error('Supabase exact match error:', exactError)
        } else if (exactData) {
          console.log('✅ Product found (exact match):', exactData.name, exactData.code)
          return exactData
        }
        
        console.warn('❌ Product not found in Supabase:', normalizedCode)
        // Fallback to mock data
        const mockProduct = mockProducts.find(
          p => p.code?.toUpperCase() === normalizedCode || p.barcode?.toUpperCase() === normalizedCode
        )
        if (mockProduct) {
          console.log('✅ Product found in mock data:', mockProduct.name)
          return mockProduct
        }
        
        return null
      } catch (error) {
        console.error('Supabase error, trying mock data:', error)
        // Fallback to mock data
        const mockProduct = mockProducts.find(
          p => p.code?.toUpperCase() === normalizedCode || p.barcode?.toUpperCase() === normalizedCode
        )
        if (mockProduct) {
          console.log('✅ Product found in mock data (fallback):', mockProduct.name)
          return mockProduct
        }
        return null
      }
    }
    
    // Mock data fallback
    const mockProduct = mockProducts.find(
      p => p.code?.toUpperCase() === normalizedCode || p.barcode?.toUpperCase() === normalizedCode
    )
    if (mockProduct) {
      console.log('✅ Product found in mock data:', mockProduct.name)
      return mockProduct
    }
    
    console.warn('❌ Product not found anywhere:', normalizedCode)
    return null
  },

  /**
   * Search products
   */
  search: async (query) => {
    if (!query || query.trim() === '') {
      return []
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .or(`code.ilike.%${query}%,barcode.ilike.%${query}%,name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(50)

        if (error) throw error
        return data || []
      } catch (error) {
        console.error('Supabase error, using mock data:', error)
        // Fallback to mock search
      }
    }

    // Mock search
    const lowerQuery = query.toLowerCase().trim()
    return mockProducts.filter(product => {
      return (
        product.code?.toLowerCase().includes(lowerQuery) ||
        product.barcode?.toLowerCase().includes(lowerQuery) ||
        product.name?.toLowerCase().includes(lowerQuery) ||
        product.description?.toLowerCase().includes(lowerQuery)
      )
    })
  },

  /**
   * Create product
   */
  create: async (productData) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const tenantId = useTenantStore.getState().currentTenantId
        if (!tenantId) throw new Error('No tenant selected. Please log in again.')
        const { data, error } = await supabase
          .from('products')
          .insert([{ ...productData, tenant_id: tenantId }])
          .select()
          .single()

        if (error) {
          // Handle duplicate code error
          if (error.code === '23505' && (error.message.includes('products_code_key') || error.message.includes('idx_products_tenant_code'))) {
            throw new Error(`El código "${productData.code}" ya existe. Por favor, usa un código diferente.`)
          }
          throw error
        }
        return data
      } catch (error) {
        console.error('Supabase error:', error)
        // Re-throw user-friendly errors
        if (error.message && error.message.includes('ya existe')) {
          throw error
        }
        // Fallback to mock
        const newProduct = {
          id: Date.now(),
          ...productData,
          created_at: new Date().toISOString()
        }
        mockProducts.push(newProduct)
        return newProduct
      }
    }

    // Mock create
    const newProduct = {
      id: Date.now(),
      ...productData,
      created_at: new Date().toISOString()
    }
    mockProducts.push(newProduct)
    return newProduct
  },

  /**
   * Update product
   */
  update: async (id, productData) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        return data
      } catch (error) {
        console.error('Supabase error:', error)
        // Fallback to mock
        const index = mockProducts.findIndex(p => p.id === id)
        if (index >= 0) {
          mockProducts[index] = { ...mockProducts[index], ...productData }
          return mockProducts[index]
        }
        throw new Error('Product not found')
      }
    }

    // Mock update
    const index = mockProducts.findIndex(p => p.id === id)
    if (index >= 0) {
      mockProducts[index] = { ...mockProducts[index], ...productData }
      return mockProducts[index]
    }
    throw new Error('Product not found')
  },

  /**
   * Delete product
   */
  delete: async (id) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id)

        if (error) throw error
        return true
      } catch (error) {
        console.error('Supabase error:', error)
        // Fallback to mock
        const index = mockProducts.findIndex(p => p.id === id)
        if (index >= 0) {
          mockProducts.splice(index, 1)
          return true
        }
        throw new Error('Product not found')
      }
    }

    // Mock delete
    const index = mockProducts.findIndex(p => p.id === id)
    if (index >= 0) {
      mockProducts.splice(index, 1)
      return true
    }
    throw new Error('Product not found')
  }
}

// Legacy exports for backward compatibility
export const searchProducts = productService.search
export const findProductByCode = productService.findByCode
export const getProductById = productService.getById
export const createProduct = productService.create