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
    this.retryIntervalMs = 60 * 1000
    this.retrySeriesCount = 5
    this.retryAttemptsPerSeries = 5
    this.maxRetryAttempts = this.retrySeriesCount * this.retryAttemptsPerSeries
    this.retryTimerId = null
  }

  /**
   * Initialize sync service
   */
  init() {
    if (this.retryTimerId) {
      return
    }

    // Listen for network status changes
    networkService.addListener((isOnline) => {
      if (isOnline && this.autoSyncEnabled) {
        // Keep the reconnect delay short so sync feels immediate.
        setTimeout(() => {
          this.syncAll().catch((error) => {
            console.warn('⚠️ Auto-sync after reconnect failed:', error)
          })
        }, 300)
      }
    })

    this.retryTimerId = setInterval(() => {
      if (!this.autoSyncEnabled || !networkService.checkStatus()) {
        return
      }

      this.syncAll().catch((error) => {
        console.warn('⚠️ Scheduled retry sync failed:', error)
      })
    }, this.retryIntervalMs)

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
    const operationId = await localStorageService.addPendingOperation({
      type: 'CREATE_PRODUCT',
      data: productData
    })
    this.syncIfOnlineSoon()
    return operationId
  }

  /**
   * Queue an update product operation
   */
  async queueUpdateProduct(productId, productData) {
    const operationId = await localStorageService.addPendingOperation({
      type: 'UPDATE_PRODUCT',
      data: { id: productId, ...productData }
    })
    this.syncIfOnlineSoon()
    return operationId
  }

  /**
   * Queue a delete product operation
   */
  async queueDeleteProduct(productId) {
    const operationId = await localStorageService.addPendingOperation({
      type: 'DELETE_PRODUCT',
      data: { id: productId }
    })
    this.syncIfOnlineSoon()
    return operationId
  }

  /**
   * Queue a stock adjustment operation
   */
  async queueStockAdjustment(productId, quantity, type, notes) {
    const operationId = await localStorageService.addPendingOperation({
      type: 'STOCK_ADJUSTMENT',
      data: { productId, quantity, adjustmentType: type, notes }
    })
    this.syncIfOnlineSoon()
    return operationId
  }

  /**
   * Trigger sync quickly when online to keep queue near real-time.
   */
  syncIfOnlineSoon() {
    if (!this.autoSyncEnabled || this.isSyncing || !networkService.checkStatus()) {
      return
    }

    setTimeout(() => {
      this.syncAll().catch((error) => {
        console.warn('⚠️ Immediate sync attempt failed:', error)
      })
    }, 150)
  }

  /**
   * Get pending operations count
   */
  async getPendingCount() {
    const operations = await localStorageService.getPendingOperations()
    return operations.filter(op => op.status === 'pending' && (op.retry_count || 0) < this.maxRetryAttempts).length
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
      const now = Date.now()
      const pendingOps = operations.filter((op) => {
        if (op.status !== 'pending') return false
        if ((op.retry_count || 0) >= this.maxRetryAttempts) return false
        if (op.next_retry_at && op.next_retry_at > now) return false
        return true
      })

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

          const nextRetryCount = (operation.retry_count || 0) + 1
          const exhaustedRetries = nextRetryCount >= this.maxRetryAttempts
          const connectivityFailure = this.isConnectivityError(error)

          if (connectivityFailure) {
            await localStorageService.updatePendingOperation(operation.id, {
              status: exhaustedRetries ? 'failed' : 'pending',
              retry_count: nextRetryCount,
              next_retry_at: exhaustedRetries ? null : Date.now() + this.retryIntervalMs,
              last_error: error?.message || String(error)
            })
          } else {
            // Non-connectivity errors are treated as hard failures to avoid infinite retries.
            await localStorageService.updatePendingOperation(operation.id, {
              status: 'failed',
              retry_count: nextRetryCount,
              next_retry_at: null,
              last_error: error?.message || String(error)
            })
          }
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
   * Determine whether a failure is connectivity-related (safe to retry).
   */
  isConnectivityError(error) {
    if (!networkService.checkStatus()) return true

    const message = String(error?.message || error || '').toLowerCase()
    return (
      message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('network request failed') ||
      message.includes('load failed') ||
      message.includes('timeout') ||
      message.includes('offline')
    )
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
          .insert([{
            ...data,
            business_id: tenantId,
            _local_temp_id: undefined
          }])
          .select()
          .single()

        if (error) throw error

        const localTempId = data?._local_temp_id

        if (localTempId) {
          await localStorageService.deleteProduct(localTempId)

          const operations = await localStorageService.getPendingOperations()
          const dependentOps = operations.filter((op) => {
            if (op.id === operation.id) return false
            if (op.status !== 'pending') return false
            return op.data?.id === localTempId || op.data?.productId === localTempId
          })

          for (const dependentOp of dependentOps) {
            const nextData = { ...dependentOp.data }
            if (nextData.id === localTempId) nextData.id = product.id
            if (nextData.productId === localTempId) nextData.productId = product.id
            await localStorageService.updatePendingOperation(dependentOp.id, { data: nextData })
          }
        }

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
