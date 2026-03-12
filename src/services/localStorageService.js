/**
 * Local Storage Service
 * Manages IndexedDB for offline data persistence
 */

const DB_NAME = 'moneymachine_db'
const DB_VERSION = 1
const STORES = {
  PRODUCTS: 'products',
  SALES: 'sales',
  PENDING_OPERATIONS: 'pending_operations',
  METADATA: 'metadata'
}

class LocalStorageService {
  constructor() {
    this.db = null
    this.initPromise = null
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    if (this.db) return this.db
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Error opening IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('✅ IndexedDB initialized successfully')
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Products store
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productsStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' })
          productsStore.createIndex('code', 'code', { unique: false })
          productsStore.createIndex('barcode', 'barcode', { unique: false })
          productsStore.createIndex('name', 'name', { unique: false })
          productsStore.createIndex('tenant_id', 'tenant_id', { unique: false })
        }

        // Sales store
        if (!db.objectStoreNames.contains(STORES.SALES)) {
          const salesStore = db.createObjectStore(STORES.SALES, { keyPath: 'id' })
          salesStore.createIndex('created_at', 'created_at', { unique: false })
          salesStore.createIndex('tenant_id', 'tenant_id', { unique: false })
        }

        // Pending operations store (for sync queue)
        if (!db.objectStoreNames.contains(STORES.PENDING_OPERATIONS)) {
          const opsStore = db.createObjectStore(STORES.PENDING_OPERATIONS, { keyPath: 'id', autoIncrement: true })
          opsStore.createIndex('timestamp', 'timestamp', { unique: false })
          opsStore.createIndex('type', 'type', { unique: false })
        }

        // Metadata store (for sync timestamps, etc.)
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' })
        }

        console.log('✅ IndexedDB structure created')
      }
    })

    return this.initPromise
  }

  /**
   * Save products to local storage
   */
  async saveProducts(products) {
    await this.init()
    const tx = this.db.transaction(STORES.PRODUCTS, 'readwrite')
    const store = tx.objectStore(STORES.PRODUCTS)

    for (const product of products) {
      store.put(product)
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Get all products from local storage
   */
  async getProducts() {
    await this.init()
    const tx = this.db.transaction(STORES.PRODUCTS, 'readonly')
    const store = tx.objectStore(STORES.PRODUCTS)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get a single product by ID
   */
  async getProduct(id) {
    await this.init()
    const tx = this.db.transaction(STORES.PRODUCTS, 'readonly')
    const store = tx.objectStore(STORES.PRODUCTS)
    const request = store.get(id)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Save a single product
   */
  async saveProduct(product) {
    await this.init()
    const tx = this.db.transaction(STORES.PRODUCTS, 'readwrite')
    const store = tx.objectStore(STORES.PRODUCTS)
    store.put(product)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(product)
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Delete a product
   */
  async deleteProduct(id) {
    await this.init()
    const tx = this.db.transaction(STORES.PRODUCTS, 'readwrite')
    const store = tx.objectStore(STORES.PRODUCTS)
    store.delete(id)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Search products locally
   */
  async searchProducts(query) {
    const products = await this.getProducts()
    const lowerQuery = query.toLowerCase().trim()

    return products.filter(product => {
      return (
        product.code?.toLowerCase().includes(lowerQuery) ||
        product.barcode?.toLowerCase().includes(lowerQuery) ||
        product.name?.toLowerCase().includes(lowerQuery) ||
        product.description?.toLowerCase().includes(lowerQuery)
      )
    })
  }

  /**
   * Add pending operation to sync queue
   */
  async addPendingOperation(operation) {
    await this.init()
    const tx = this.db.transaction(STORES.PENDING_OPERATIONS, 'readwrite')
    const store = tx.objectStore(STORES.PENDING_OPERATIONS)
    
    const opWithTimestamp = {
      ...operation,
      timestamp: Date.now(),
      status: 'pending',
      retry_count: 0,
      next_retry_at: Date.now(),
      last_error: null
    }
    
    const request = store.add(opWithTimestamp)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('📝 Pending operation added:', operation.type)
        resolve(request.result)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Update an existing pending operation
   */
  async updatePendingOperation(id, updates) {
    await this.init()
    const tx = this.db.transaction(STORES.PENDING_OPERATIONS, 'readwrite')
    const store = tx.objectStore(STORES.PENDING_OPERATIONS)
    const getRequest = store.get(id)

    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const existing = getRequest.result
        if (!existing) {
          resolve(null)
          return
        }

        const putRequest = store.put({ ...existing, ...updates, id })
        putRequest.onsuccess = () => resolve(putRequest.result)
        putRequest.onerror = () => reject(putRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Get all pending operations
   */
  async getPendingOperations() {
    await this.init()
    const tx = this.db.transaction(STORES.PENDING_OPERATIONS, 'readonly')
    const store = tx.objectStore(STORES.PENDING_OPERATIONS)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Remove a pending operation
   */
  async removePendingOperation(id) {
    await this.init()
    const tx = this.db.transaction(STORES.PENDING_OPERATIONS, 'readwrite')
    const store = tx.objectStore(STORES.PENDING_OPERATIONS)
    store.delete(id)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Clear all pending operations
   */
  async clearPendingOperations() {
    await this.init()
    const tx = this.db.transaction(STORES.PENDING_OPERATIONS, 'readwrite')
    const store = tx.objectStore(STORES.PENDING_OPERATIONS)
    store.clear()

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Save metadata
   */
  async saveMetadata(key, value) {
    await this.init()
    const tx = this.db.transaction(STORES.METADATA, 'readwrite')
    const store = tx.objectStore(STORES.METADATA)
    store.put({ key, value, updated_at: Date.now() })

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Get metadata
   */
  async getMetadata(key) {
    await this.init()
    const tx = this.db.transaction(STORES.METADATA, 'readonly')
    const store = tx.objectStore(STORES.METADATA)
    const request = store.get(key)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.value)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear all local data (useful for logout)
   */
  async clearAll() {
    await this.init()
    const stores = [STORES.PRODUCTS, STORES.SALES, STORES.PENDING_OPERATIONS, STORES.METADATA]
    
    for (const storeName of stores) {
      const tx = this.db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      store.clear()
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    }
    
    console.log('🗑️ All local data cleared')
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService()
