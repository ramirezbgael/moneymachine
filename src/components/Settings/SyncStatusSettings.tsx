import React, { useEffect, useState } from 'react'
import { offlineProductService } from '../../services/offlineProductService'
import { syncQueueService } from '../../services/syncQueueService'
import { localStorageService } from '../../services/localStorageService'
import { networkService } from '../../services/networkService'
import { FiCheckCircle, FiAlertCircle, FiClock, FiRefreshCw, FiDatabase, FiWifi, FiWifiOff } from 'react-icons/fi'

interface SyncStatus {
  isOnline: boolean
  pendingOperations: number
  lastSync: Date | null
}

export function SyncStatusSettings() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    pendingOperations: 0,
    lastSync: null
  })
  const [localProductsCount, setLocalProductsCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    loadSyncStatus()

    // Listen to network changes
    const unsubNetwork = networkService.addListener(() => {
      loadSyncStatus()
    })

    // Listen to sync events
    const unsubSync = syncQueueService.addSyncListener((event: any) => {
      if (event.type === 'SYNC_START') {
        setIsSyncing(true)
        setSyncMessage('Sincronizando...')
      } else if (event.type === 'SYNC_COMPLETE') {
        setIsSyncing(false)
        setSyncMessage(`✅ Sincronización exitosa: ${event.success} operaciones`)
        setTimeout(() => setSyncMessage(''), 5000)
        loadSyncStatus()
      } else if (event.type === 'SYNC_ERROR') {
        setIsSyncing(false)
        setSyncMessage('❌ Error en la sincronización')
        setTimeout(() => setSyncMessage(''), 5000)
      }
    })

    // Refresh every 10 seconds
    const interval = setInterval(loadSyncStatus, 10000)

    return () => {
      unsubNetwork()
      unsubSync()
      clearInterval(interval)
    }
  }, [])

  const loadSyncStatus = async () => {
    try {
      const status = await offlineProductService.getSyncStatus()
      setSyncStatus(status)

      const products = await localStorageService.getProducts()
      setLocalProductsCount(products.length)
    } catch (error) {
      console.error('Error loading sync status:', error)
    }
  }

  const handleForceSync = async () => {
    if (!syncStatus.isOnline) {
      setSyncMessage('❌ No hay conexión a internet')
      setTimeout(() => setSyncMessage(''), 3000)
      return
    }

    try {
      setIsSyncing(true)
      setSyncMessage('Sincronizando...')
      await syncQueueService.forceSyncNow()
      setSyncMessage('✅ Sincronización completada')
      setTimeout(() => setSyncMessage(''), 3000)
      await loadSyncStatus()
    } catch (error) {
      console.error('Sync error:', error)
      setSyncMessage('❌ Error al sincronizar')
      setTimeout(() => setSyncMessage(''), 3000)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleRefreshFromServer = async () => {
    if (!syncStatus.isOnline) {
      setSyncMessage('❌ No hay conexión a internet')
      setTimeout(() => setSyncMessage(''), 3000)
      return
    }

    try {
      setIsSyncing(true)
      setSyncMessage('Descargando desde servidor...')
      await offlineProductService.forceRefresh()
      setSyncMessage('✅ Datos actualizados desde el servidor')
      setTimeout(() => setSyncMessage(''), 3000)
      await loadSyncStatus()
    } catch (error) {
      console.error('Refresh error:', error)
      setSyncMessage('❌ Error al actualizar')
      setTimeout(() => setSyncMessage(''), 3000)
    } finally {
      setIsSyncing(false)
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Nunca'
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Hace un momento'
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`
    return `Hace ${days} día${days > 1 ? 's' : ''}`
  }

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'text-red-500'
    if (syncStatus.pendingOperations > 0) return 'text-amber-500'
    return 'text-green-500'
  }

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return <FiWifiOff className="w-5 h-5" />
    if (syncStatus.pendingOperations > 0) return <FiAlertCircle className="w-5 h-5" />
    return <FiCheckCircle className="w-5 h-5" />
  }

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Sin conexión'
    if (syncStatus.pendingOperations > 0) return 'Con cambios pendientes'
    return 'Sincronizado'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text)] mb-2">
          Estado de Sincronización
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Verifica que tus datos locales estén actualizados y sincronizados con el servidor.
        </p>
      </div>

      {/* Status Card */}
      <div className="rounded-2xl bg-[var(--panel)] border border-[var(--border)] p-6">
        <div className="flex items-start gap-4">
          <div className={`${getStatusColor()} mt-1`}>
            {getStatusIcon()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-1">
              {getStatusText()}
            </h3>
            <p className="text-sm text-[var(--muted)]">
              {syncStatus.isOnline 
                ? 'Tu aplicación está conectada al servidor y tus datos están protegidos.' 
                : 'Trabajando sin conexión. Los cambios se sincronizarán automáticamente cuando vuelva la conexión.'}
            </p>
          </div>
        </div>

        {syncMessage && (
          <div className="mt-4 px-4 py-2 rounded-lg bg-[var(--panel-2)] text-sm text-[var(--text)]">
            {syncMessage}
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Connection Status */}
        <div className="rounded-xl bg-[var(--panel)] border border-[var(--border)] p-4">
          <div className="flex items-center gap-3 mb-2">
            {syncStatus.isOnline ? (
              <FiWifi className="w-4 h-4 text-green-500" />
            ) : (
              <FiWifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm font-medium text-[var(--text)]">
              Conexión
            </span>
          </div>
          <p className={`text-lg font-semibold ${syncStatus.isOnline ? 'text-green-500' : 'text-red-500'}`}>
            {syncStatus.isOnline ? 'En línea' : 'Sin conexión'}
          </p>
        </div>

        {/* Pending Operations */}
        <div className="rounded-xl bg-[var(--panel)] border border-[var(--border)] p-4">
          <div className="flex items-center gap-3 mb-2">
            <FiClock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-[var(--text)]">
              Operaciones pendientes
            </span>
          </div>
          <p className={`text-lg font-semibold ${syncStatus.pendingOperations > 0 ? 'text-amber-500' : 'text-green-500'}`}>
            {syncStatus.pendingOperations}
          </p>
        </div>

        {/* Last Sync */}
        <div className="rounded-xl bg-[var(--panel)] border border-[var(--border)] p-4">
          <div className="flex items-center gap-3 mb-2">
            <FiRefreshCw className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-sm font-medium text-[var(--text)]">
              Última sincronización
            </span>
          </div>
          <p className="text-lg font-semibold text-[var(--text)]">
            {formatDate(syncStatus.lastSync)}
          </p>
        </div>

        {/* Local Products */}
        <div className="rounded-xl bg-[var(--panel)] border border-[var(--border)] p-4">
          <div className="flex items-center gap-3 mb-2">
            <FiDatabase className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-[var(--text)]">
              Productos locales
            </span>
          </div>
          <p className="text-lg font-semibold text-[var(--text)]">
            {localProductsCount}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleForceSync}
          disabled={!syncStatus.isOnline || isSyncing || syncStatus.pendingOperations === 0}
          className="w-full rounded-xl bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 disabled:bg-[var(--panel)] disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--accent)]/30 disabled:border-[var(--border)] px-4 py-3 flex items-center justify-center gap-3 text-[var(--accent)] disabled:text-[var(--muted)] font-medium transition-colors"
        >
          <FiRefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>
            {isSyncing 
              ? 'Sincronizando...' 
              : syncStatus.pendingOperations === 0 
                ? 'No hay cambios pendientes'
                : `Sincronizar ahora (${syncStatus.pendingOperations} cambios)`}
          </span>
        </button>

        <button
          onClick={handleRefreshFromServer}
          disabled={!syncStatus.isOnline || isSyncing}
          className="w-full rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-2)] disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--border)] px-4 py-3 flex items-center justify-center gap-3 text-[var(--text)] font-medium transition-colors"
        >
          <FiDatabase className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Actualizar desde servidor</span>
        </button>
      </div>

      {/* Info Box */}
      <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-4">
        <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
          💡 ¿Cómo funciona?
        </h4>
        <ul className="text-xs text-[var(--muted)] space-y-1">
          <li>• Todos tus cambios se guardan primero en tu dispositivo (copia local)</li>
          <li>• Si hay internet, se sincronizan automáticamente con el servidor</li>
          <li>• Sin internet, puedes seguir trabajando normalmente</li>
          <li>• Cuando vuelva la conexión, todo se sincroniza automáticamente</li>
          <li>• Tus datos están siempre protegidos y nunca se pierden</li>
        </ul>
      </div>

      {!syncStatus.isOnline && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
          <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">
            ⚠️ Trabajando sin conexión
          </h4>
          <p className="text-xs text-[var(--muted)]">
            Puedes seguir usando la aplicación normalmente. Todos los cambios que hagas se guardarán
            localmente y se sincronizarán automáticamente cuando vuelva la conexión a internet.
          </p>
        </div>
      )}
    </div>
  )
}
