/**
 * Offline Product Service
 * Offline-first wrapper for product operations
 * Uses local storage first, syncs with Supabase when online
 */

import { productService } from './productService'
import { localStorageService } from './localStorageService'
import { syncQueueService } from './syncQueueService'
import { networkService } from './networkService'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTenantStore } from '../store/tenantStore'

export const offlineProductService = {
  /**
   * Initialize offline services
   */
  init: async () => {
    await localStorageService.init()
    networkService.init()
    syncQueueService.init()
    
    // Try to sync products if online
    if (networkService.checkStatus() && isSupabaseConfigured()) {
      try {
        const products = await productService.getAll()
        await localStorageService.saveProducts(products)
        await localStorageService.saveMetadata('last_products_sync', Date.now())
        console.log('✅ Products synced to local storage')
      } catch (error) {
        console.warn('⚠️ Failed to initial sync products:', error)
      }
    }
  },

  /**
   * Get all products (offline-first)
   */
  getAll: async () => {
    // Always try local storage first
    try {
      const localProducts = await localStorageService.getProducts()
      
      // If we have local data, return it immediately
      if (localProducts && localProducts.length > 0) {
        console.log(`📦 Loaded ${localProducts.length} products from local storage`)
        
        // In background, update from server if online
        if (networkService.checkStatus() && isSupabaseConfigured()) {
          setTimeout(async () => {
            try {
              const serverProducts = await productService.getAll()
              await localStorageService.saveProducts(serverProducts)
              await localStorageService.saveMetadata('last_products_sync', Date.now())
              console.log('🔄 Background sync: products updated')
            } catch (error) {
              console.warn('⚠️ Background sync failed:', error)
            }
          }, 100)
        }
        
        return localProducts
      }
      
      // No local data, try to fetch from server
      if (networkService.checkStatus()) {
        const products = await productService.getAll()
        await localStorageService.saveProducts(products)
        await localStorageService.saveMetadata('last_products_sync', Date.now())
        return products
      }
      
      // Offline with no local data
      console.warn('📴 Offline with no local products')
      return []
    } catch (error) {
      console.error('Error in getAll:', error)
      // Last resort: try online service
      if (networkService.checkStatus()) {
        return productService.getAll()
      }
      return []
    }
  },

  /**
   * Get product by ID (offline-first)
   */
  getById: async (id) => {
    try {
      // Try local first
      const localProduct = await localStorageService.getProduct(id)
      if (localProduct) {
        return localProduct
      }
      
      // Not found locally, try server if online
      if (networkService.checkStatus()) {
        const product = await productService.getById(id)
        if (product) {
          await localStorageService.saveProduct(product)
        }
        return product
      }
      
      return null
    } catch (error) {
      console.error('Error in getById:', error)
      return null
    }
  },

  /**
   * Find product by code or barcode (offline-first)
   */
  findByCode: async (code) => {
    try {
      // Search in local storage
      const allProducts = await localStorageService.getProducts()
      const normalizedCode = code.trim().toUpperCase()
      
      const localProduct = allProducts.find(
        p => p.code?.toUpperCase() === normalizedCode || 
             p.barcode?.toUpperCase() === normalizedCode
      )
      
      if (localProduct) {
        return localProduct
      }
      
      // Not found locally, try server if online
      if (networkService.checkStatus()) {
        return productService.findByCode(code)
      }
      
      return null
    } catch (error) {
      console.error('Error in findByCode:', error)
      return null
    }
  },

  /**
   * Search products (offline-first)
   */
  search: async (query) => {
    try {
      // Search local storage
      const results = await localStorageService.searchProducts(query)
      
      // If online, also search remotely and merge results
      if (networkService.checkStatus() && isSupabaseConfigured()) {
        try {
          const serverResults = await productService.search(query)
          // Merge and deduplicate
          const merged = [...results]
          serverResults.forEach(serverProduct => {
            if (!merged.find(p => p.id === serverProduct.id)) {
              merged.push(serverProduct)
            }
          })
          return merged
        } catch (error) {
          console.warn('Server search failed, using local only:', error)
          return results
        }
      }
      
      return results
    } catch (error) {
      console.error('Error in search:', error)
      return []
    }
  },

  /**
   * Create product (offline-first)
   */
  create: async (productData) => {
    try {
      // Create temporary local product
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const localProduct = {
        id: tempId,
        ...productData,
        created_at: new Date().toISOString(),
        _isLocal: true,
        _needsSync: true
      }
      
      // Save to local storage immediately
      await localStorageService.saveProduct(localProduct)
      
      // If online, try to create on server
      if (networkService.checkStatus() && isSupabaseConfigured()) {
        try {
          const serverProduct = await productService.create(productData)
          
          // Replace temp product with real one
          await localStorageService.deleteProduct(tempId)
          await localStorageService.saveProduct(serverProduct)
          
          return serverProduct
        } catch (error) {
          console.warn('⚠️ Could not create on server, queued for sync:', error)
          // Queue for sync
          await syncQueueService.queueCreateProduct(productData)
          return localProduct
        }
      } else {
        // Offline: queue for sync
        console.log('📴 Offline: product queued for sync')
        await syncQueueService.queueCreateProduct(productData)
        return localProduct
      }
    } catch (error) {
      console.error('Error in create:', error)
      throw error
    }
  },

  /**
   * Update product (offline-first)
   */
  update: async (id, productData) => {
    try {
      // Update local storage immediately
      const localProduct = await localStorageService.getProduct(id)
      if (localProduct) {
        const updatedProduct = { ...localProduct, ...productData }
        await localStorageService.saveProduct(updatedProduct)
      }
      
      // If online, update on server
      if (networkService.checkStatus() && isSupabaseConfigured()) {
        try {
          const serverProduct = await productService.update(id, productData)
          await localStorageService.saveProduct(serverProduct)
          return serverProduct
        } catch (error) {
          console.warn('⚠️ Could not update on server, queued for sync:', error)
          // Queue for sync
          await syncQueueService.queueUpdateProduct(id, productData)
          return { ...localProduct, ...productData }
        }
      } else {
        // Offline: queue for sync
        console.log('📴 Offline: update queued for sync')
        await syncQueueService.queueUpdateProduct(id, productData)
        return { ...localProduct, ...productData }
      }
    } catch (error) {
      console.error('Error in update:', error)
      throw error
    }
  },

  /**
   * Delete product (offline-first)
   */
  delete: async (id) => {
    try {
      // Mark as deleted locally (or actually delete)
      await localStorageService.deleteProduct(id)
      
      // If online, delete on server
      if (networkService.checkStatus() && isSupabaseConfigured()) {
        try {
          await productService.delete(id)
          return true
        } catch (error) {
          console.warn('⚠️ Could not delete on server, queued for sync:', error)
          // Queue for sync
          await syncQueueService.queueDeleteProduct(id)
          return true
        }
      } else {
        // Offline: queue for sync
        console.log('📴 Offline: deletion queued for sync')
        await syncQueueService.queueDeleteProduct(id)
        return true
      }
    } catch (error) {
      console.error('Error in delete:', error)
      throw error
    }
  },

  /**
   * Force refresh from server
   */
  forceRefresh: async () => {
    if (!networkService.checkStatus()) {
      throw new Error('Cannot refresh: offline')
    }
    
    const products = await productService.getAll()
    await localStorageService.saveProducts(products)
    await localStorageService.saveMetadata('last_products_sync', Date.now())
    console.log('🔄 Products refreshed from server')
    return products
  },

  /**
   * Get sync status
   */
  getSyncStatus: async () => {
    const pendingCount = await syncQueueService.getPendingCount()
    const lastSync = await localStorageService.getMetadata('last_products_sync')
    const isOnline = networkService.checkStatus()
    
    return {
      isOnline,
      pendingOperations: pendingCount,
      lastSync: lastSync ? new Date(lastSync) : null
    }
  }
}
