import React, { useMemo, useState, useCallback } from 'react'
import {
  printTicket,
  isTauri,
  getTicketText,
  normalizeSaleForPrinting
} from '../../../services/printerService'
import { useSettingsStore } from '../../../store/settingsStore'

/**
 * Tras guardar venta como pendiente: confirma éxito, pregunta si imprime ticket, imprime en Tauri o muestra copia en navegador.
 */
export function PendingSavedModal({ sale, onClose, t }) {
  const printerName = useSettingsStore((s) => s.printerName) || ''
  const printerWidth = useSettingsStore((s) => s.printerWidth) || '80mm'
  const [step, setStep] = useState('ask')
  const [printing, setPrinting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [copied, setCopied] = useState(false)
  const inTauri = isTauri()

  const salePrint = useMemo(
    () =>
      normalizeSaleForPrinting(sale, {
        pendingPaymentLabel: t('currentSale.pendingTicketPayment')
      }),
    [sale, t]
  )

  const ticketText = useMemo(
    () => (salePrint ? getTicketText(salePrint) : ''),
    [salePrint]
  )

  const focusSearch = useCallback(() => {
    setTimeout(() => {
      document.querySelector('.pos-sale-search .product-search__input')?.focus()
    }, 80)
  }, [])

  const handleClose = useCallback(() => {
    setStep('ask')
    setFeedback('')
    setCopied(false)
    onClose()
    focusSearch()
  }, [onClose, focusSearch])

  const handleNoTicket = useCallback(() => {
    handleClose()
  }, [handleClose])

  const handleYesTicket = useCallback(async () => {
    if (!salePrint) return
    setPrinting(true)
    setFeedback('')

    if (inTauri) {
      try {
        await printTicket(salePrint, { printerName, printerWidth })
        setFeedback('ok')
        setStep('done')
      } catch (err) {
        console.error(err)
        setFeedback(err?.message || t('currentSale.pendingPrintError'))
        setStep('done')
      } finally {
        setPrinting(false)
      }
      return
    }

    setStep('browser')
    setPrinting(false)
  }, [salePrint, inTauri, printerName, printerWidth, t])

  const handleCopy = useCallback(async () => {
    if (!ticketText) return
    try {
      await navigator.clipboard.writeText(ticketText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setFeedback(t('currentSale.pendingCopyError'))
    }
  }, [ticketText, t])

  if (!sale) return null

  const folio = sale.sale_number || sale.id
  const total = Number(sale.total ?? 0).toFixed(2)

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-saved-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && step === 'ask') handleNoTicket()
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 id="pending-saved-title" className="text-lg font-semibold text-zinc-50">
            {t('currentSale.pendingModalTitle')}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{t('currentSale.pendingModalSubtitle')}</p>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-zinc-950/80 px-4 py-3 ring-1 ring-zinc-800">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                {t('pendingSales.folio')}
              </p>
              <p className="font-mono text-sm font-semibold text-zinc-200">{folio}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                {t('currentSale.total')}
              </p>
              <p className="text-lg font-bold tabular-nums text-emerald-400">${total}</p>
            </div>
          </div>

          {step === 'ask' && (
            <>
              <p className="text-center text-sm font-medium text-zinc-300">
                {t('currentSale.pendingPrintQuestion')}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleNoTicket}
                  className="rounded-xl border border-zinc-600 bg-zinc-800/80 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
                >
                  {t('currentSale.pendingPrintNo')}
                </button>
                <button
                  type="button"
                  disabled={printing}
                  onClick={handleYesTicket}
                  className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {printing ? t('currentSale.pendingPrinting') : t('currentSale.pendingPrintYes')}
                </button>
              </div>
            </>
          )}

          {step === 'browser' && (
            <>
              <p className="text-sm text-zinc-400">{t('currentSale.pendingBrowserHint')}</p>
              <pre className="max-h-40 overflow-auto rounded-lg border border-zinc-800 bg-black/40 p-3 font-mono text-[11px] leading-snug text-zinc-300">
                {ticketText}
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                className="w-full rounded-xl border border-zinc-600 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
              >
                {copied ? t('currentSale.pendingCopied') : t('currentSale.pendingCopyTicket')}
              </button>
              {feedback ? <p className="text-center text-xs text-amber-400">{feedback}</p> : null}
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl bg-emerald-500/15 py-2.5 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/20"
              >
                {t('currentSale.pendingContinue')}
              </button>
            </>
          )}

          {step === 'done' && (
            <>
              <p
                className={`text-center text-sm ${
                  feedback === 'ok' ? 'text-emerald-400' : 'text-amber-200/90'
                }`}
              >
                {feedback === 'ok'
                  ? t('currentSale.pendingPrintSent')
                  : feedback || t('currentSale.pendingPrintError')}
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-zinc-950 hover:bg-emerald-400"
              >
                {t('currentSale.pendingContinue')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PendingSavedModal
