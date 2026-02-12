/**
 * Product service
 * Handles product CRUD operations with Supabase or mock fallback
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTenantStore } from '../store/tenantStore'

// Mock products - Tienda de computadoras y papelería (tipo Zona Asist)
const mockProducts = [
  {
    id: 1,
    code: 'PAPEL-A4',
    barcode: '7501001001001',
    name: 'Papel bond carta 500 hojas',
    description: 'Resma de papel bond blanco tamaño carta',
    price: 85.00,
    cost: 65.00,
    stock: 45
  },
  {
    id: 2,
    code: 'LAP-BIC',
    barcode: '7501001001002',
    name: 'Lapicero Bic Cristal azul',
    description: 'Caja con 12 lapiceros',
    price: 35.00,
    cost: 22.00,
    stock: 80
  },
  {
    id: 3,
    code: 'USB-32GB',
    barcode: '7501001001003',
    name: 'Memoria USB Kingston 32GB',
    description: 'USB 3.0 alta velocidad',
    price: 145.00,
    cost: 95.00,
    stock: 25
  },
  {
    id: 4,
    code: 'MOUSE-LOG',
    barcode: '7501001001004',
    name: 'Mouse Logitech M170 inalámbrico',
    description: 'Mouse óptico inalámbrico con receptor USB',
    price: 185.00,
    cost: 125.00,
    stock: 18
  },
  {
    id: 5,
    code: 'TECLADO-HP',
    barcode: '7501001001005',
    name: 'Teclado HP USB español',
    description: 'Teclado alambrico USB layout español',
    price: 220.00,
    cost: 155.00,
    stock: 12
  },
  {
    id: 6,
    code: 'RAM-8GB',
    barcode: '7501001001006',
    name: 'Memoria RAM DDR4 8GB Kingston',
    description: 'RAM DDR4 2666MHz DIMM',
    price: 420.00,
    cost: 310.00,
    stock: 15
  },
  {
    id: 7,
    code: 'HDD-1TB',
    barcode: '7501001001007',
    name: 'Disco duro WD Blue 1TB',
    description: 'Disco duro interno 3.5" SATA 7200 RPM',
    price: 850.00,
    cost: 650.00,
    stock: 8
  },
  {
    id: 8,
    code: 'SSD-240',
    barcode: '7501001001008',
    name: 'SSD Kingston A400 240GB',
    description: 'Unidad de estado solido 2.5" SATA',
    price: 520.00,
    cost: 380.00,
    stock: 22
  },
  {
    id: 9,
    code: 'CARCASA-ATX',
    barcode: '7501001001009',
    name: 'Gabinete Thermaltake V200 negro',
    description: 'Carcasa ATX media torre con ventana',
    price: 980.00,
    cost: 720.00,
    stock: 5
  },
  {
    id: 10,
    code: 'CUADERNO-100',
    barcode: '7501001001010',
    name: 'Cuaderno profesional 100 hojas',
    description: 'Cuaderno raya francés',
    price: 32.00,
    cost: 20.00,
    stock: 95
  },
  {
    id: 11,
    code: 'CABLE-HDMI',
    barcode: '7501001001011',
    name: 'Cable HDMI 1.8m',
    description: 'Cable HDMI 2.0 alta velocidad',
    price: 95.00,
    cost: 55.00,
    stock: 38
  },
  {
    id: 12,
    code: 'TINTA-HP',
    barcode: '7501001001012',
    name: 'Cartucho HP 664 negro',
    description: 'Tinta original HP para DeskJet',
    price: 285.00,
    cost: 210.00,
    stock: 14
  },
  {
    id: 13,
    code: 'PRINT-BN',
    barcode: 'PRINT-BN',
    name: 'Impresión B/N',
    description: 'Impresión blanco y negro por hoja',
    price: 2.00,
    cost: 0.50,
    stock: 999
  },
  {
    id: 14,
    code: 'PRINT-COLOR',
    barcode: 'PRINT-COLOR',
    name: 'Impresión a color',
    description: 'Impresión a color por hoja',
    price: 5.00,
    cost: 2.00,
    stock: 999
  },
  {
    id: 15,
    code: 'INTERNET-1H',
    barcode: 'INTERNET-1H',
    name: 'Internet 1 hora',
    description: 'Tiempo de uso de computadora e internet',
    price: 15.00,
    cost: 0,
    stock: 999
  },
  {
    id: 16,
    code: 'MONITOR-24',
    barcode: '7501001001016',
    name: 'Monitor Samsung 24" LED Full HD',
    description: 'Monitor LED 1920x1080 HDMI VGA',
    price: 2450.00,
    cost: 1850.00,
    stock: 6
  },
  {
    id: 17,
    code: 'WEBCAM-LOG',
    barcode: '7501001001017',
    name: 'Webcam Logitech C270 HD',
    description: 'Cámara web 720p con micrófono',
    price: 450.00,
    cost: 310.00,
    stock: 12
  },
  {
    id: 18,
    code: 'AUDIFONOS-HP',
    barcode: '7501001001018',
    name: 'Audífonos HP con micrófono',
    description: 'Headset USB para videoconferencias',
    price: 280.00,
    cost: 190.00,
    stock: 20
  },
  {
    id: 19,
    code: 'MOUSEPAD',
    barcode: '7501001001019',
    name: 'Mousepad ergonómico gel',
    description: 'Pad para mouse con reposamuñecas',
    price: 65.00,
    cost: 35.00,
    stock: 45
  },
  {
    id: 20,
    code: 'ENGRAPADORA',
    barcode: '7501001001020',
    name: 'Engrapadora metálica Swingline',
    description: 'Engrapadora de escritorio 20 hojas',
    price: 95.00,
    cost: 60.00,
    stock: 28
  },
  {
    id: 21,
    code: 'CLIPS-100',
    barcode: '7501001001021',
    name: 'Clips metálicos caja 100pz',
    description: 'Clips estándar #1',
    price: 18.00,
    cost: 10.00,
    stock: 120
  },
  {
    id: 22,
    code: 'CARPETA-AZ',
    barcode: '7501001001022',
    name: 'Carpeta de argollas 2" azul',
    description: 'Carpeta vinílica 3 argollas tamaño carta',
    price: 52.00,
    cost: 32.00,
    stock: 35
  },
  {
    id: 23,
    code: 'POST-IT',
    barcode: '7501001001023',
    name: 'Post-it notas adhesivas 3x3',
    description: 'Bloque de 100 hojas amarillas',
    price: 28.00,
    cost: 16.00,
    stock: 68
  },
  {
    id: 24,
    code: 'MARCADOR-SHARPIE',
    barcode: '7501001001024',
    name: 'Marcador permanente Sharpie negro',
    description: 'Marcador punta fina indeleble',
    price: 22.00,
    cost: 14.00,
    stock: 85
  },
  {
    id: 25,
    code: 'CABLE-USB-C',
    barcode: '7501001001025',
    name: 'Cable USB-C a USB-A 1m',
    description: 'Cable carga rápida trenzado',
    price: 85.00,
    cost: 50.00,
    stock: 42
  },
  {
    id: 26,
    code: 'HUB-USB',
    barcode: '7501001001026',
    name: 'Hub USB 3.0 4 puertos',
    description: 'Concentrador USB 3.0 con LED',
    price: 195.00,
    cost: 125.00,
    stock: 18
  },
  {
    id: 27,
    code: 'LIMPIADOR-PC',
    barcode: '7501001001027',
    name: 'Aire comprimido para electrónicos',
    description: 'Limpiador en aerosol 400ml',
    price: 68.00,
    cost: 42.00,
    stock: 32
  },
  {
    id: 28,
    code: 'CANDADO-CABLE',
    barcode: '7501001001028',
    name: 'Candado de seguridad Kensington',
    description: 'Cable de seguridad para laptop',
    price: 220.00,
    cost: 145.00,
    stock: 9
  },
  {
    id: 29,
    code: 'MICA-LAPTOP',
    barcode: '7501001001029',
    name: 'Mica protectora laptop 15.6"',
    description: 'Protector de pantalla anti-reflejo',
    price: 95.00,
    cost: 58.00,
    stock: 24
  },
  {
    id: 30,
    code: 'BATERIA-AA',
    barcode: '7501001001030',
    name: 'Pilas AA Duracell 4pack',
    description: 'Baterías alcalinas AA x4',
    price: 68.00,
    cost: 42.00,
    stock: 55
  }
]

// Obtener productos demo (desde localStorage o mockProducts default)
function getDemoProducts() {
  try {
    const stored = localStorage.getItem('demo-products')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('📦 Demo products from localStorage:', parsed.length)
        return parsed
      }
    }
  } catch (e) {
    console.warn('Error loading demo-products from localStorage:', e)
  }
  // Si no hay en localStorage, usar mockProducts y guardarlos
  console.log('📦 Initializing demo products:', mockProducts.length)
  localStorage.setItem('demo-products', JSON.stringify(mockProducts))
  return [...mockProducts]
}

// Exportar mockProducts para modo demo
export { mockProducts }

export const productService = {
  /**
   * Get all products
   */
  getAll: async () => {
    // En modo demo, usar productos de localStorage
    if (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/demo')) {
      return getDemoProducts()
    }
    
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
    // En modo demo buscar en localStorage
    if (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/demo')) {
      const current = getDemoProducts()
      return current.find(p => p.id == id) || null
    }
    
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
    
    const normalizedCode = code.trim().toUpperCase()
    console.log('🔍 Searching for product with code:', normalizedCode)
    
    // En modo demo buscar en productos de localStorage
    if (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/demo')) {
      const current = getDemoProducts()
      const found = current.find(p => p.code?.toUpperCase() === normalizedCode || p.barcode?.toUpperCase() === normalizedCode)
      if (found) console.log('✅ Product found in demo:', found.name)
      else console.warn('❌ Product not found in demo:', normalizedCode)
      return found || null
    }
    
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

    // En modo demo buscar en productos de localStorage
    if (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/demo')) {
      const current = getDemoProducts()
      const lowerQuery = query.toLowerCase().trim()
      return current.filter(p =>
        p.code?.toLowerCase().includes(lowerQuery) ||
        p.barcode?.toLowerCase().includes(lowerQuery) ||
        p.name?.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery)
      )
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
    // En modo demo guardar en localStorage
    if (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/demo')) {
      const current = getDemoProducts()
      const newId = Math.max(...current.map(p => p.id), 0) + 1
      const newProduct = {
        id: newId,
        code: productData.code,
        barcode: productData.barcode || productData.code,
        name: productData.name,
        description: productData.description || '',
        price: productData.price || 0,
        cost: productData.cost || 0,
        stock: productData.stock || 0,
        created_at: new Date().toISOString(),
        ...productData
      }
      current.push(newProduct)
      localStorage.setItem('demo-products', JSON.stringify(current))
      return newProduct
    }
    
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
    // En modo demo actualizar en localStorage
    if (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/demo')) {
      const current = getDemoProducts()
      const idx = current.findIndex(p => p.id == id)
      if (idx >= 0) {
        current[idx] = { ...current[idx], ...productData }
        localStorage.setItem('demo-products', JSON.stringify(current))
        return current[idx]
      }
      throw new Error('Product not found')
    }
    
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
    // En modo demo eliminar de localStorage
    if (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/demo')) {
      const current = getDemoProducts()
      const filtered = current.filter(p => p.id != id)
      localStorage.setItem('demo-products', JSON.stringify(filtered))
      return true
    }
    
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