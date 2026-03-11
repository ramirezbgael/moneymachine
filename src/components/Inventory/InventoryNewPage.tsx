import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useInventoryStore } from '../../store/inventoryStore'
import { useSettingsStore } from '../../store/settingsStore'
import { ScanInput, type ScanInputRef } from './ScanInput'
import { VoiceToggle } from './VoiceToggle'
import { SessionList } from './SessionList'
import { NewProductWizard } from './NewProductWizard'
import { LiquidButton } from './LiquidButton'
import type { ScanSessionItem } from '../../types/inventory'
import { useNavigate } from 'react-router-dom'

export function InventoryNewPage() {
  const navigate = useNavigate()
  const { t } = useSettingsStore()
  const {
    products,
    fetchProducts,
    scanSessionProducts,
    lastScannedCode,
    voiceEnabled,
    loading,
    addScanSessionItem,
    saveScanSession,
    clearScanSession,
    setLastScannedCode,
    setVoiceEnabled,
  } = useInventoryStore()

  const [wizardOpen, setWizardOpen] = useState(false)
  const [pendingCodes, setPendingCodes] = useState<string[]>([])
  const [activePendingCode, setActivePendingCode] = useState<string | null>(null)
  const [pendingStockQuantity, setPendingStockQuantity] = useState(1)
  const scanInputRef = useRef<ScanInputRef>(null)
  const [existingProductChoice, setExistingProductChoice] = useState<{
    code: string
    productId: number | string
  } | null>(null)
  const [showExistingModal, setShowExistingModal] = useState(false)

  const speechAvailable =
    typeof window !== 'undefined' &&
    (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window))

  useEffect(() => {
    if (!products.length) {
      fetchProducts()
    }
  }, [fetchProducts, products.length])

  useEffect(() => {
    if (!wizardOpen) {
      setTimeout(() => scanInputRef.current?.focus(), 50)
    }
  }, [wizardOpen])

  const totalSession = scanSessionProducts.length

  const handleScan = (code: string) => {
    setLastScannedCode(code)
    const existing = products.find(
      (p) => p.code === code || p.barcode === code
    )

    if (existing) {
      setExistingProductChoice({ code, productId: existing.id })
      setPendingStockQuantity(1)
      setShowExistingModal(true)
      return
    }

    // Nuevo producto -> agregar a cola pendiente sin pisar los anteriores
    setPendingCodes((prev) => {
      if (prev.includes(code)) {
        return prev
      }
      return [...prev, code]
    })

    if (!wizardOpen) {
      setActivePendingCode(code)
      setWizardOpen(true)
      return
    }

    if (!activePendingCode) {
      setActivePendingCode(code)
      setWizardOpen(true)
    }
  }

  const handleRegistered = (item: ScanSessionItem) => {
    addScanSessionItem(item)

    setPendingCodes((prev) => {
      const next = prev.filter((c) => c !== item.code)
      const nextActive = next[0] ?? null
      setActivePendingCode(nextActive)
      setWizardOpen(Boolean(nextActive))
      return next
    })
  }

  const dismissPendingCode = (codeToDismiss: string) => {
    setPendingCodes((prev) => {
      const next = prev.filter((c) => c !== codeToDismiss)
      const nextActive = next[0] ?? null
      setActivePendingCode(nextActive)
      setWizardOpen(Boolean(nextActive))
      return next
    })
  }

  const lastCodeText = useMemo(
    () => lastScannedCode || '—',
    [lastScannedCode]
  )

  return (
    <div className="h-full bg-[var(--bg)] text-[var(--text)] px-3 py-2 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full flex flex-col gap-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-[var(--text)]">{t('inventoryNewPage.title')}</h1>
            <p className="text-[11px] text-[var(--muted)]">
              {t('inventoryNewPage.subtitle')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <VoiceToggle
              enabled={voiceEnabled}
              available={speechAvailable}
              onToggle={setVoiceEnabled}
            />
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] hover:underline"
            >
              {t('inventoryNewPage.backToInventory')}
            </button>
          </div>
        </div>

        {/* Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-2xl bg-[var(--panel-2)] border border-[var(--border)] backdrop-blur-sm px-3 py-2">
            <div className="text-[11px] text-[var(--muted)]">{t('inventoryNewPage.registeredProductsSession')}</div>
            <div className="text-lg font-semibold text-[var(--accent)] mt-0">{totalSession}</div>
          </div>
          <div className="rounded-2xl bg-[var(--panel-2)] border border-[var(--border)] backdrop-blur-sm px-3 py-2">
            <div className="text-[11px] text-[var(--muted)]">{t('inventoryNewPage.lastScannedCode')}</div>
            <div className="mt-0.5 font-mono text-sm text-[var(--text)] truncate">{lastCodeText}</div>
          </div>
          <div className="rounded-2xl bg-[var(--panel-2)] border border-[var(--border)] backdrop-blur-sm px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] text-[var(--muted)]">{t('inventoryNewPage.quickActions')}</span>
            <LiquidButton
              variant="secondary"
              size="sm"
              onClick={() => clearScanSession()}
              disabled={scanSessionProducts.length === 0}
            >
              {t('inventoryNewPage.clearSession')}
            </LiquidButton>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 flex-1 min-h-0">
          {/* Escaneo + wizard inline */}
          <div className="lg:col-span-2 flex flex-col gap-2.5 min-h-0">
            <div className="rounded-2xl bg-[var(--panel)] border border-[var(--border)] backdrop-blur-md p-3">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-1">{t('inventoryNewPage.scanSection')}</h2>
              <p className="text-[11px] text-[var(--muted)] mb-2 leading-snug">
                {t('inventoryNewPage.scanHint')}
              </p>
              <ScanInput ref={scanInputRef} onScan={handleScan} />
            </div>

            {wizardOpen && pendingCodes.length > 0 && (
              <div className="relative flex-1 min-h-0 overflow-y-auto">
                {pendingCodes
                  .slice(0, 4)
                  .map((code, index) => ({ code, index }))
                  .reverse()
                  .map(({ code, index }) => {
                    const isTopCard = index === 0
                    return (
                      <div
                        key={code}
                        className="absolute inset-x-0 top-0 transition-all duration-300"
                        style={{
                          zIndex: 50 - index,
                          transform: `translateY(${index * 10}px) translateX(${index * 4}px) scale(${1 - index * 0.015})`,
                          opacity: 1 - index * 0.14,
                          pointerEvents: isTopCard ? 'auto' : 'none',
                        }}
                      >
                        <NewProductWizard
                          open={wizardOpen}
                          code={code}
                          onClose={() => dismissPendingCode(code)}
                          voiceEnabled={voiceEnabled}
                          speechAvailable={speechAvailable}
                          onRegistered={(item) => handleRegistered(item)}
                          autoCloseOnRegistered={false}
                          compact
                        />
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Sesión lateral */}
          <div className="lg:col-span-1 h-full min-h-0">
            <SessionList 
              items={scanSessionProducts} 
              onSave={saveScanSession}
              loading={loading}
            />
          </div>
        </div>

        {/* Modal producto existente */}
        {showExistingModal && existingProductChoice && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-[var(--panel)] border border-[var(--border)] p-5 md:p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                {t('inventoryNewPage.existsModal.title')}
              </h2>
              <p className="text-sm text-[var(--muted)]">
                {t('inventoryNewPage.existsModal.description')}
              </p>
              
              {/* Input para cantidad de stock */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--text)]">
                  Cantidad a agregar
                </label>
                <input
                  type="number"
                  min="1"
                  value={pendingStockQuantity}
                  onChange={(e) => setPendingStockQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const product = products.find((p) => p.id === existingProductChoice?.productId)
                      if (product) {
                        const sessionItem: ScanSessionItem = {
                          id: `session-existing-${product.id}-${Date.now()}`,
                          productId: product.id,
                          code: product.code,
                          name: product.name,
                          initialStock: pendingStockQuantity,
                          purchasePrice: product.cost ?? 0,
                          salePrice: product.price ?? 0,
                          isNew: false,
                        }
                        addScanSessionItem(sessionItem)
                      }
                      setShowExistingModal(false)
                      setExistingProductChoice(null)
                      setTimeout(() => scanInputRef.current?.focus(), 50)
                    }
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <LiquidButton
                  onClick={() => {
                    const product = products.find((p) => p.id === existingProductChoice.productId)
                    if (product) {
                      const sessionItem: ScanSessionItem = {
                        id: `session-existing-${product.id}-${Date.now()}`,
                        productId: product.id,
                        code: product.code,
                        name: product.name,
                        initialStock: pendingStockQuantity,
                        purchasePrice: product.cost ?? 0,
                        salePrice: product.price ?? 0,
                        isNew: false,
                      }
                      addScanSessionItem(sessionItem)
                    }
                    setShowExistingModal(false)
                    setExistingProductChoice(null)
                    setTimeout(() => scanInputRef.current?.focus(), 50)
                  }}
                >
                  {t('inventoryNewPage.existsModal.addStock')}
                </LiquidButton>
                <LiquidButton
                  variant="secondary"
                  onClick={() => {
                    if (existingProductChoice) {
                      navigate(`/inventory/producto/${existingProductChoice.productId}`)
                    }
                    setShowExistingModal(false)
                    setExistingProductChoice(null)
                  }}
                >
                  {t('inventoryNewPage.existsModal.editDetails')}
                </LiquidButton>
                <LiquidButton
                  variant="secondary"
                  onClick={() => {
                    setShowExistingModal(false)
                    setExistingProductChoice(null)
                    setTimeout(() => scanInputRef.current?.focus(), 50)
                  }}
                >
                  {t('common.cancel')}
                </LiquidButton>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}



