/**
 * Sync Queue Service
 * Manages synchronization of pending operations when network is restored
 */

import { localStorageService } from './localStorageService'
import { networkService } from './networkService'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTenantStore } from '../store/tenantStore'

class SyncQueueService {
  constructor() {
    this.isSyncing = false
    this.syncListeners = []
    this.autoSyncEnabled = true
  }

  /**
   * Initialize sync service
   */
  init() {
    // Listen for network status changes
    networkService.addListener((isOnline) => {
      if (isOnline && this.autoSyncEnabled) {
        // Wait a bit before syncing to ensure connection is stable
        setTimeout(() => {
          this.syncAll()
        }, 2000)
      }
    })

    console.log('🔄 Sync queue service initialized')
  }

  /**
   * Add a listener for sync events
   * @param {Function} callback - Called with sync status updates
   * @returns {Function} - Unsubscribe function
   */
  addSyncListener(callback) {
    this.syncListeners.push(callback)
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback)
    }
  }

  /**
   * Notify listeners of sync events
   */
  notifySyncListeners(event) {
    this.syncListeners.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in sync listener:', error)
      }
    })
  }

  /**
   * Queue a create product operation
   */
  async queueCreateProduct(productData) {
    return localStorageService.addPendingOperation({
      type: 'CREATE_PRODUCT',
      data: productData
    })
  }

  /**
   * Queue an update product operation
   */
  async queueUpdateProduct(productId, productData) {
    return localStorageService.addPendingOperation({
      type: 'UPDATE_PRODUCT',
      data: { id: productId, ...productData }
    })
  }

  /**
   * Queue a delete product operation
   */
  async queueDeleteProduct(productId) {
    return localStorageService.addPendingOperation({
      type: 'DELETE_PRODUCT',
      data: { id: productId }
    })
  }

  /**
   * Queue a stock adjustment operation
   */
  async queueStockAdjustment(productId, quantity, type, notes) {
    return localStorageService.addPendingOperation({
      type: 'STOCK_ADJUSTMENT',
      data: { productId, quantity, adjustmentType: type, notes }
    })
  }

  /**
   * Get pending operations count
   */
  async getPendingCount() {
    const operations = await localStorageService.getPendingOperations()
    return operations.filter(op => op.status === 'pending').length
  }

  /**
   * Sync all pending operations
   */
  async syncAll() {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...')
      return
    }

    if (!networkService.checkStatus()) {
      console.log('📴 Cannot sync: offline')
      return
    }

    if (!isSupabaseConfigured()) {
      console.log('⚠️ Cannot sync: Supabase not configured')
      return
    }

    this.isSyncing = true
    this.notifySyncListeners({ type: 'SYNC_START' })

    try {
      const operations = await localStorageService.getPendingOperations()
      const pendingOps = operations.filter(op => op.status === 'pending')

      console.log(`🔄 Starting sync: ${pendingOps.length} operations pending`)

      let successCount = 0
      let failCount = 0

      for (const operation of pendingOps) {
        try {
          await this.executeOperation(operation)
          await localStorageService.removePendingOperation(operation.id)
          successCount++
          console.log(`✅ Synced operation ${operation.id}: ${operation.type}`)
        } catch (error) {
          console.error(`❌ Failed to sync operation ${operation.id}:`, error)
          failCount++
          
          // Mark operation as failed but keep it for retry
          // You could add retry logic here
        }
      }

      console.log(`🔄 Sync complete: ${successCount} succeeded, ${failCount} failed`)
      
      this.notifySyncListeners({
        type: 'SYNC_COMPLETE',
        success: successCount,
        failed: failCount
      })

      return { success: successCount, failed: failCount }
    } catch (error) {
      console.error('❌ Sync error:', error)
      this.notifySyncListeners({ type: 'SYNC_ERROR', error })
      throw error
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Execute a single pending operation
   */
  async executeOperation(operation) {
    const { type, data } = operation
    const tenantId = useTenantStore.getState().currentTenantId

    if (!tenantId) {
      throw new Error('No tenant ID available')
    }

    switch (type) {
      case 'CREATE_PRODUCT': {
        const { data: product, error } = await supabase
          .from('products')
          .insert([{ ...data, tenant_id: tenantId }])
          .select()
          .single()

        if (error) throw error

        // Update local storage with the real ID
        await localStorageService.saveProduct(product)
        return product
      }

      case 'UPDATE_PRODUCT': {
        const { id, ...updateData } = data
        const { data: product, error } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // Update local storage
        await localStorageService.saveProduct(product)
        return product
      }

      case 'DELETE_PRODUCT': {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', data.id)

        if (error) throw error

        // Remove from local storage
        await localStorageService.deleteProduct(data.id)
        return { id: data.id }
      }

      case 'STOCK_ADJUSTMENT': {
        const { productId, quantity, adjustmentType, notes } = data
        
        // Get current product
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single()

        if (fetchError) throw fetchError

        // Calculate new stock
        const currentStock = product.stock || 0
        const newStock = adjustmentType === 'increment' 
          ? currentStock + quantity 
          : currentStock - quantity

        // Update stock
        const { data: updatedProduct, error: updateError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', productId)
          .select()
          .single()

        if (updateError) throw updateError

        // Update local storage
        await localStorageService.saveProduct(updatedProduct)
        return updatedProduct
      }

      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }

  /**
   * Force sync now (manual trigger)
   */
  async forceSyncNow() {
    console.log('🔄 Force sync triggered')
    return this.syncAll()
  }

  /**
   * Clear all pending operations (use with caution)
   */
  async clearQueue() {
    console.warn('🗑️ Clearing sync queue')
    await localStorageService.clearPendingOperations()
    this.notifySyncListeners({ type: 'QUEUE_CLEARED' })
  }
}

// Export singleton instance
export const syncQueueService = new SyncQueueService()
