/**
 * Network Service
 * Manages network connectivity detection and status
 */

class NetworkService {
  constructor() {
    this.isOnline = navigator.onLine
    this.listeners = []
    this.initialized = false
  }

  /**
   * Initialize network monitoring
   */
  init() {
    if (this.initialized) return

    window.addEventListener('online', () => {
      console.log('🌐 Network: ONLINE')
      this.isOnline = true
      this.notifyListeners(true)
    })

    window.addEventListener('offline', () => {
      console.log('📴 Network: OFFLINE')
      this.isOnline = false
      this.notifyListeners(false)
    })

    this.initialized = true
    console.log(`🌐 Network monitoring initialized. Current status: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`)
  }

  /**
   * Check if currently online
   */
  checkStatus() {
    this.isOnline = navigator.onLine
    return this.isOnline
  }

  /**
   * Add a listener for network status changes
   * @param {Function} callback - Called with boolean (true = online, false = offline)
   * @returns {Function} - Unsubscribe function
   */
  addListener(callback) {
    this.listeners.push(callback)
    // Call immediately with current status
    callback(this.isOnline)

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback)
    }
  }

  /**
   * Notify all listeners of status change
   */
  notifyListeners(isOnline) {
    this.listeners.forEach(callback => {
      try {
        callback(isOnline)
      } catch (error) {
        console.error('Error in network listener:', error)
      }
    })
  }

  /**
   * Test actual connectivity by pinging a server
   */
  async testConnectivity() {
    try {
      // Try to fetch a small resource from Supabase or another reliable endpoint
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      console.warn('Connectivity test failed:', error.message)
      return false
    }
  }
}

// Export singleton instance
export const networkService = new NetworkService()
