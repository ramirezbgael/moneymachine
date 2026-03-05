import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useInventoryStore } from '../../store/inventoryStore'
import { ScanInput, type ScanInputRef } from './ScanInput'
import { VoiceToggle } from './VoiceToggle'
import { SessionList } from './SessionList'
import { NewProductWizard } from './NewProductWizard'
import { LiquidButton } from './LiquidButton'
import type { ScanSessionItem } from '../../types/inventory'
import { useNavigate } from 'react-router-dom'

export function InventoryNewPage() {
  const navigate = useNavigate()
  const {
    products,
    fetchProducts,
    scanSessionProducts,
    lastScannedCode,
    voiceEnabled,
    addScanSessionItem,
    clearScanSession,
    setLastScannedCode,
    setVoiceEnabled,
  } = useInventoryStore()

  const [wizardOpen, setWizardOpen] = useState(false)
  const [pendingCode, setPendingCode] = useState('')
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

  const totalSession = scanSessionProducts.length

  const handleScan = (code: string) => {
    setLastScannedCode(code)
    const existing = products.find(
      (p) => p.code === code || p.barcode === code
    )

    if (existing) {
      setExistingProductChoice({ code, productId: existing.id })
      setShowExistingModal(true)
      return
    }

    // Nuevo producto -> abrir wizard rápido
    setPendingCode(code)
    setWizardOpen(true)
  }

  const handleRegistered = (item: ScanSessionItem) => {
    addScanSessionItem(item)
  }

  const lastCodeText = useMemo(
    () => lastScannedCode || '—',
    [lastScannedCode]
  )

  return (
    <div className="min-h-full bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">Inventario nuevo</h1>
            <p className="text-sm text-[var(--muted)]">
              Escanea productos para registrarlos rápido.
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
              ← Volver al inventario
            </button>
          </div>
        </div>

        {/* Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl bg-[var(--panel-2)] border border-[var(--border)] backdrop-blur-sm px-4 py-3">
            <div className="text-xs text-[var(--muted)]">Productos registrados en esta sesión</div>
            <div className="text-2xl font-semibold text-[var(--accent)] mt-1">{totalSession}</div>
          </div>
          <div className="rounded-3xl bg-[var(--panel-2)] border border-[var(--border)] backdrop-blur-sm px-4 py-3">
            <div className="text-xs text-[var(--muted)]">Último código leído</div>
            <div className="mt-1 font-mono text-sm text-[var(--text)] truncate">{lastCodeText}</div>
          </div>
          <div className="rounded-3xl bg-[var(--panel-2)] border border-[var(--border)] backdrop-blur-sm px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-[var(--muted)]">Acciones rápidas</span>
            <LiquidButton
              variant="secondary"
              size="sm"
              onClick={() => clearScanSession()}
              disabled={scanSessionProducts.length === 0}
            >
              Limpiar sesión
            </LiquidButton>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Escaneo + wizard inline */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="rounded-3xl bg-[var(--panel)] border border-[var(--border)] backdrop-blur-md p-6">
              <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Escaneo</h2>
              <p className="text-xs text-[var(--muted)] mb-4">
                Usa un escáner USB o escribe el código y presiona Enter. El campo se mantiene
                siempre listo para el siguiente código.
              </p>
              <ScanInput ref={scanInputRef} onScan={handleScan} />
            </div>

            {wizardOpen && (
              <NewProductWizard
                open={wizardOpen}
                code={pendingCode}
                onClose={() => {
                  setWizardOpen(false)
                  setTimeout(() => scanInputRef.current?.focus(), 50)
                }}
                voiceEnabled={voiceEnabled}
                speechAvailable={speechAvailable}
                onRegistered={handleRegistered}
              />
            )}
          </div>

          {/* Sesión lateral */}
          <div className="lg:col-span-1 h-full">
            <SessionList items={scanSessionProducts} onClear={clearScanSession} />
          </div>
        </div>

        {/* Modal producto existente */}
        {showExistingModal && existingProductChoice && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-[var(--panel)] border border-[var(--border)] p-5 md:p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                Producto ya existe
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Este código ya está registrado. ¿Qué deseas hacer?
              </p>
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
                        initialStock: 0,
                        purchasePrice: product.cost ?? 0,
                        salePrice: product.price ?? 0,
                        isNew: false,
                      }
                      addScanSessionItem(sessionItem)
                    }
                    setShowExistingModal(false)
                    setExistingProductChoice(null)
                  }}
                >
                  Sumar stock (registrar entrada rápida)
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
                  Editar detalles
                </LiquidButton>
                <LiquidButton
                  variant="secondary"
                  onClick={() => {
                    setShowExistingModal(false)
                    setExistingProductChoice(null)
                  }}
                >
                  Cancelar
                </LiquidButton>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

