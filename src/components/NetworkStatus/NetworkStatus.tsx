import React, { useEffect, useState } from 'react'
import { networkService } from '../../services/networkService'
import { syncQueueService } from '../../services/syncQueueService'

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(networkService.checkStatus())
  const [pendingOps, setPendingOps] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const toastAnchorClass = 'fixed right-3 top-[calc(env(safe-area-inset-top)+72px)] md:right-4 md:top-4 z-50'

  useEffect(() => {
    // Listen to network changes
    const unsubNetwork = networkService.addListener((online: boolean) => {
      setIsOnline(online)
    })

    // Listen to sync events
    const unsubSync = syncQueueService.addSyncListener((event: any) => {
      if (event.type === 'SYNC_START') {
        setIsSyncing(true)
      } else if (event.type === 'SYNC_COMPLETE' || event.type === 'SYNC_ERROR') {
        setIsSyncing(false)
        updatePendingCount()
      }
    })

    // Initial pending count
    updatePendingCount()

    // Update pending count periodically
    const interval = setInterval(updatePendingCount, 10000) // Every 10 seconds

    return () => {
      unsubNetwork()
      unsubSync()
      clearInterval(interval)
    }
  }, [])

  const updatePendingCount = async () => {
    try {
      const count = await syncQueueService.getPendingCount()
      setPendingOps(count)
    } catch (error) {
      console.error('Error getting pending count:', error)
    }
  }

  if (!isOnline && pendingOps === 0) {
    // Show minimal offline indicator
    return (
      <div className={toastAnchorClass}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] shadow-lg cursor-pointer"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-xs text-[var(--muted)]">Sin conexión</span>
        </div>
      </div>
    )
  }

  if (!isOnline || pendingOps > 0) {
    return (
      <div className={toastAnchorClass}>
        <div 
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] shadow-lg cursor-pointer"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`}></div>
          <span className="text-xs text-[var(--text)] font-medium">
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
          {pendingOps > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 text-[10px] font-semibold">
              {pendingOps} pendiente{pendingOps > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {showDetails && (
          <div className="mt-2 p-4 rounded-lg bg-[var(--panel)] border border-[var(--border)] shadow-xl min-w-[250px]">
            <h4 className="text-sm font-semibold text-[var(--text)] mb-3">Estado de sincronización</h4>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Conexión:</span>
                <span className={`font-medium ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
                  {isOnline ? 'En línea' : 'Sin conexión'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Operaciones pendientes:</span>
                <span className="font-medium text-[var(--text)]">{pendingOps}</span>
              </div>

              {isSyncing && (
                <div className="flex items-center gap-2 text-[var(--accent)] pt-2">
                  <div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                  <span>Sincronizando...</span>
                </div>
              )}

            </div>

            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <p className="text-[10px] text-[var(--muted)]">
                {isOnline 
                  ? 'Los cambios se sincronizan automáticamente. Si falla por conexión, reintenta 5x5 cada minuto.'
                  : 'Los cambios se guardan localmente y subirán en cuanto vuelva la conexión.'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Online with no pending operations - show minimal green indicator
  return (
    <div className={toastAnchorClass}>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] shadow-lg cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className="text-xs text-[var(--muted)]">En línea</span>
      </div>
    </div>
  )
}
