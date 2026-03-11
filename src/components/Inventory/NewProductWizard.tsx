import React, { useEffect, useMemo, useState } from 'react'
import type { Product, ScanSessionItem } from '../../types/inventory'
import { LiquidButton } from './LiquidButton'
import { useInventoryStore } from '../../store/inventoryStore'
import { useSettingsStore } from '../../store/settingsStore'

interface NewProductWizardProps {
  open: boolean
  code: string
  onClose: () => void
  voiceEnabled: boolean
  speechAvailable: boolean
  onRegistered: (sessionItem: ScanSessionItem) => void
  autoCloseOnRegistered?: boolean
  compact?: boolean
}

declare global {
  interface Window {
    webkitSpeechRecognition?: any
    SpeechRecognition?: any
  }
}

export function NewProductWizard({
  open,
  code,
  onClose,
  voiceEnabled,
  speechAvailable,
  onRegistered,
  autoCloseOnRegistered = true,
  compact = false,
}: NewProductWizardProps) {
  const { t } = useSettingsStore()
  const { createProduct, addMovement } = useInventoryStore()

  const [name, setName] = useState('')
  const [stock, setStock] = useState(1)
  const [purchasePrice, setPurchasePrice] = useState(0)
  const [salePrice, setSalePrice] = useState(0)
  const [saving, setSaving] = useState(false)
  const [listening, setListening] = useState(false)

  const margin = useMemo(() => {
    if (!purchasePrice || !salePrice || purchasePrice <= 0) return null
    return Math.round(((salePrice - purchasePrice) / purchasePrice) * 100)
  }, [purchasePrice, salePrice])

  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    if (open && voiceEnabled) {
      speak(t('inventoryNewPage.newProductWizard.voicePrompt'))
    }
  }, [open, voiceEnabled])

  useEffect(() => {
    if (!open) return
    // Reset form when switching to another scanned code.
    setName('')
    setStock(1)
    setPurchasePrice(0)
    setSalePrice(0)
    setSaving(false)
    setListening(false)
  }, [code, open])

  const handleDictate = (field: 'name') => {
    if (!speechAvailable || typeof window === 'undefined') return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'es-MX'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string
      if (field === 'name') setName(transcript)
    }
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognition.start()
  }

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim() || stock <= 0) {
      return
    }
    setSaving(true)
    try {
      const productData: Partial<Product> & { name: string; code: string; price: number } = {
        name: name.trim(),
        code: code.trim(),
        price: salePrice || 0,
        stock,
        cost: purchasePrice || 0,
      } as any

      const created = await createProduct(productData)

      addMovement({
        productId: created.id,
        type: 'entrada',
        quantity: stock,
        motivo: 'inventario_nuevo',
        referencia: 'inventario_nuevo',
        nota: `Inventario inicial ${new Date().toLocaleDateString()}`,
        usuario: 'usuario',
      })

      const sessionItem: ScanSessionItem = {
        id: `session-${created.id}-${Date.now()}`,
        productId: created.id,
        code: created.code,
        name: created.name,
        initialStock: stock,
        purchasePrice: purchasePrice || 0,
        salePrice: salePrice || 0,
        isNew: true,
      }

      onRegistered(sessionItem)
      if (autoCloseOnRegistered) {
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  // Enter en cualquier campo: enviar y quedar listo para el siguiente
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    const target = e.target as HTMLElement
    if (target.tagName === 'TEXTAREA') return
    e.preventDefault()
    if (
      !saving &&
      name.trim() &&
      code.trim() &&
      stock > 0
    ) {
      handleSubmit()
    }
  }

  return (
    <div
      role="form"
      onKeyDown={handleKeyDown}
      className={`rounded-3xl bg-[linear-gradient(180deg,rgba(13,18,16,0.97)_0%,rgba(8,12,11,0.97)_100%)] border border-[var(--border)] shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-all max-h-full overflow-y-auto ${
        compact ? 'p-3.5 space-y-2.5' : 'p-6 space-y-5'
      } ${open ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-2'}`}
    >
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--border)]/70 bg-[var(--panel-2)]/60 px-3 py-2">
        <div>
          <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold text-[var(--text)]`}>
            {t('inventoryNewPage.newProductWizard.title')}
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {t('inventoryNewPage.newProductWizard.scannedCode')} <span className="font-mono text-[var(--text)]">{code}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--muted)] hover:text-[var(--text)] text-sm px-2 py-1 rounded-xl hover:bg-[var(--panel-2)]"
        >
          {t('inventoryNewPage.newProductWizard.close')}
        </button>
      </div>

      {/* Paso 1: Nombre */}
      <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-white/70">
              {t('inventoryNewPage.newProductWizard.step1.label')}
            </label>
            {voiceEnabled && speechAvailable && (
              <button
                type="button"
                onClick={() => handleDictate('name')}
                className={`text-[11px] px-2 py-1 rounded-xl border text-white/70 transition-all ${
                  listening
                    ? 'border-[rgba(0,255,136,0.8)] bg-[rgba(0,255,136,0.16)] text-[#00ff88] shadow-[0_0_14px_rgba(0,255,136,0.45)]'
                    : 'border-white/15 hover:border-[rgba(0,255,136,0.6)] hover:text-[#00ff88]'
                }`}
              >
                <span className="mr-1">🎤</span>
                {listening ? t('inventoryNewPage.newProductWizard.step1.listening') : t('inventoryNewPage.newProductWizard.step1.dictate')}
              </button>
            )}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 ${
              compact ? 'py-2' : 'py-2.5'
            } text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none`}
            placeholder={t('inventoryNewPage.newProductWizard.step1.placeholder')}
          />
          {voiceEnabled && speechAvailable && !compact && (
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              {listening
                ? t('inventoryNewPage.newProductWizard.step1.listeningHint')
                : t('inventoryNewPage.newProductWizard.step1.hint')}
            </p>
          )}
      </div>

      {/* Paso 2 + 3: Stock y Precios */}
      <div className={`${compact ? 'grid grid-cols-1 md:grid-cols-[220px_1fr] gap-2.5 items-start' : 'space-y-3'}`}>
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1">
            {t('inventoryNewPage.newProductWizard.step2.label')}
          </label>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1.5">
            <button
              type="button"
              onClick={() => setStock((s) => Math.max(1, s - 1))}
              className="h-8 w-8 rounded-xl bg-[var(--panel-2)] border border-[var(--border)] text-base text-[var(--text)] hover:bg-[var(--panel)]"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={stock === 0 ? '' : stock}
              onChange={(e) => {
                const v = e.target.value
                if (v === '') {
                  setStock(0)
                  return
                }
                const n = parseInt(v, 10)
                if (!isNaN(n) && n >= 0) setStock(n)
              }}
              onBlur={() => {
                if (stock < 1) setStock(1)
              }}
              onFocus={(e) => e.target.select()}
              className="w-14 bg-transparent text-center text-lg font-semibold text-[var(--accent)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setStock((s) => s + 1)}
              className="h-8 w-8 rounded-xl bg-[var(--panel-2)] border border-[var(--border)] text-base text-[var(--text)] hover:bg-[var(--panel)]"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-2">
            {t('inventoryNewPage.newProductWizard.step3.label')}
          </label>
          <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
            <div>
              <div className="text-[11px] text-[var(--muted)] mb-1">{t('inventoryNewPage.newProductWizard.step3.purchasePrice')}</div>
              <input
                type="number"
                min={0}
                step="0.01"
                value={purchasePrice === 0 ? '' : purchasePrice}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') {
                    setPurchasePrice(0)
                    return
                  }
                  const n = parseFloat(v)
                  if (!Number.isNaN(n) && n >= 0) setPurchasePrice(n)
                }}
                className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 ${
                  compact ? 'py-1.5' : 'py-2'
                } text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none`}
                placeholder="0.00"
              />
            </div>
            <div>
              <div className="text-[11px] text-[var(--muted)] mb-1">{t('inventoryNewPage.newProductWizard.step3.salePrice')}</div>
              <input
                type="number"
                min={0}
                step="0.01"
                value={salePrice === 0 ? '' : salePrice}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') {
                    setSalePrice(0)
                    return
                  }
                  const n = parseFloat(v)
                  if (!Number.isNaN(n) && n >= 0) setSalePrice(n)
                }}
                className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 ${
                  compact ? 'py-1.5' : 'py-2'
                } text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none`}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[var(--muted)]">
            {t('inventoryNewPage.newProductWizard.step3.margin')}{' '}
            <span className="font-semibold text-[var(--text)]">
              {margin != null ? `${margin}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className={`flex justify-end gap-2 ${compact ? 'sticky bottom-0 -mx-3.5 mt-1 border-t border-[var(--border)] bg-[var(--panel)]/95 px-3.5 py-2 backdrop-blur-md' : 'pt-2'}`}>
        <LiquidButton variant="secondary" size="sm" onClick={onClose}>
          {t('inventoryNewPage.newProductWizard.cancel')}
        </LiquidButton>
        <LiquidButton
          size="sm"
          onClick={handleSubmit}
          disabled={
            saving ||
            !name.trim() ||
            !code.trim() ||
            stock <= 0
          }
        >
          {saving ? t('inventoryNewPage.newProductWizard.saving') : t('inventoryNewPage.newProductWizard.confirm')}
        </LiquidButton>
      </div>
    </div>
  )
}






