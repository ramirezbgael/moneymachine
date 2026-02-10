import React, { useEffect, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { useSettingsStore } from '../../store/settingsStore'
import { LiquidButton } from '../inventory/LiquidButton'
import { getTicketText } from '../../services/printerService'

interface PrinterInfo {
  name: string
  status?: string
}

export function PrinterSettings() {
  const {
    printerName,
    printerWidth,
    autoPrint,
    ticketTemplate,
    ticketFooterLines,
    businessName,
    ticketIcon,
    setPrinterSettings,
    t,
  } = useSettingsStore()

  const [localPrinterName, setLocalPrinterName] = useState(printerName)
  const [localPrinterWidth, setLocalPrinterWidth] = useState(printerWidth)
  const [localAutoPrint, setLocalAutoPrint] = useState(autoPrint)
  const [localTicketTemplate, setLocalTicketTemplate] = useState(ticketTemplate)
  const [localTicketFooterLines, setLocalTicketFooterLines] = useState(ticketFooterLines)
  const [localBusinessName, setLocalBusinessName] = useState(businessName)
  const [localTicketIcon, setLocalTicketIcon] = useState(ticketIcon)
  const [availablePrinters, setAvailablePrinters] = useState<PrinterInfo[]>([])
  const [detectingPrinters, setDetectingPrinters] = useState(false)
  const [printerError, setPrinterError] = useState('')
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')

  const printerWidths = ['58mm', '80mm', '110mm']

  useEffect(() => {
    setLocalPrinterName(printerName)
    setLocalPrinterWidth(printerWidth)
    setLocalAutoPrint(autoPrint)
    setLocalTicketTemplate(ticketTemplate)
    setLocalTicketFooterLines(ticketFooterLines)
    setLocalBusinessName(businessName)
    setLocalTicketIcon(ticketIcon)
  }, [printerName, printerWidth, autoPrint, ticketTemplate, ticketFooterLines, businessName, ticketIcon])

  const detectPrinters = async () => {
    setDetectingPrinters(true)
    setPrinterError('')
    setAvailablePrinters([])

    try {
      // Tauri v2
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const printers = (await invoke('get_printers')) as PrinterInfo[]
        if (printers && Array.isArray(printers) && printers.length > 0) {
          setAvailablePrinters(printers)
          return
        }
      } catch {
        // ignore, fall through
      }

      // Tauri v1
      // @ts-ignore
      if (window.__TAURI__?.core?.invoke) {
        // @ts-ignore
        const printers = (await window.__TAURI__.core.invoke('get_printers')) as PrinterInfo[]
        if (printers && printers.length > 0) {
          setAvailablePrinters(printers)
          return
        }
      }

      setPrinterError(
        'La detección automática no está disponible en este entorno. Usa la app de escritorio o configura la impresora manualmente.'
      )
    } finally {
      setDetectingPrinters(false)
    }
  }

  const handleTestPrinter = async () => {
    setTesting(true)
    setTestResult('')
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('test_printer', { printerName: localPrinterName })
      setTestResult('✓ Test OK. Si NO imprimió: revise cola, USB o driver.')
    } catch (err: any) {
      setTestResult(`✗ Error: ${err?.message || String(err)}`)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    setPrinterSettings({
      printerName: localPrinterName,
      printerWidth: localPrinterWidth,
      autoPrint: localAutoPrint,
      ticketTemplate: localTicketTemplate,
      ticketFooterLines: localTicketFooterLines,
      businessName: localBusinessName,
      ticketIcon: localTicketIcon,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1000)
  }

  // Vista previa del ticket con los valores actuales (sin guardar)
  const sampleSale = useMemo(
    () => ({
      sale_number: '001',
      id: 'preview',
      created_at: new Date().toISOString(),
      payment_method: 'Efectivo',
      items: [
        { quantity: 2, product: { name: 'Producto ejemplo' }, unitPrice: 10, unit_price: 10, subtotal: 20 },
        { quantity: 1, product: { name: 'Otro producto' }, unitPrice: 15, unit_price: 15, subtotal: 15 },
      ],
      sale_items: [],
      subtotal: 35,
      tax: 5.6,
      total: 40.6,
    }),
    []
  )
  const previewText = useMemo(
    () =>
      getTicketText(sampleSale, {
        businessName: localBusinessName,
        ticketIcon: localTicketIcon,
        ticketTemplate: localTicketTemplate,
        ticketFooterLines: localTicketFooterLines,
      }),
    [sampleSale, localBusinessName, localTicketIcon, localTicketTemplate, localTicketFooterLines]
  )

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
          {t('settings.printerName')}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiquidButton
            variant="secondary"
            size="sm"
            onClick={detectPrinters}
            disabled={detectingPrinters}
          >
            {detectingPrinters ? 'Detectando…' : 'Detectar impresoras'}
          </LiquidButton>
          <LiquidButton
            variant="secondary"
            size="sm"
            onClick={handleTestPrinter}
            disabled={testing || !localPrinterName}
          >
            {testing ? 'Probando…' : 'Probar impresora'}
          </LiquidButton>
          {printerError && (
            <span className="text-[11px] text-amber-300/80 max-w-xs">
              {printerError}
            </span>
          )}
          {testResult && (
            <span className={`text-[11px] max-w-xs ${testResult.startsWith('✓') ? 'text-green-300' : 'text-red-300'}`}>
              {testResult}
            </span>
          )}
        </div>
        {availablePrinters.length > 0 && (
          <div className="space-y-1">
            <div className="text-[11px] text-[var(--muted)]">Impresoras detectadas</div>
            <select
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              value={localPrinterName}
              onChange={(e) => setLocalPrinterName(e.target.value)}
            >
              <option value="">Selecciona una impresora…</option>
              {availablePrinters.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} {p.status ? `(${p.status})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <input
          type="text"
          value={localPrinterName}
          onChange={(e) => setLocalPrinterName(e.target.value)}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
          placeholder={t('settings.printerNamePlaceholder')}
        />
        <p className="text-xs text-[var(--muted)]">{t('settings.printerHint')}</p>
        {typeof navigator !== 'undefined' && /Mac|Darwin/i.test(navigator.platform) && (
          <p className="text-xs text-amber-300/90 mt-1">
            Si la térmica no imprime: en Terminal ejecute <code className="bg-black/20 px-1 rounded">sudo cupsctl WebInterface=yes</code>, luego abra{' '}
            <a href="http://localhost:631" target="_blank" rel="noopener noreferrer" className="underline">localhost:631</a>, Administration → Add Printer → su impresora USB → Make: <strong>Raw</strong>.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
          {t('settings.businessName')}
        </div>
        <input
          type="text"
          value={localBusinessName}
          onChange={(e) => setLocalBusinessName(e.target.value)}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
          placeholder={t('settings.businessNamePlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
          {t('settings.ticketIcon')}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'none', label: t('settings.ticketIconNone') },
            { key: 'tools', label: t('settings.ticketIconTools') },
            { key: 'florist', label: t('settings.ticketIconFlorist') },
            { key: 'beauty', label: t('settings.ticketIconBeauty') },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setLocalTicketIcon(key)}
              className={`rounded-2xl px-3 py-1.5 text-xs border transition-all ${
                localTicketIcon === key
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]'
                  : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] hover:border-[var(--accent-soft)] hover:text-[var(--text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
          {t('settings.paperWidth')}
        </div>
        <div className="flex flex-wrap gap-2">
          {printerWidths.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setLocalPrinterWidth(w)}
              className={`rounded-2xl px-3 py-1.5 text-xs border transition-all ${
                localPrinterWidth === w
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]'
                  : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] hover:border-[var(--accent-soft)] hover:text-[var(--text)]'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
          {t('settings.ticketTemplate')}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['simple', 'minimal', 'full'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setLocalTicketTemplate(key)}
              className={`rounded-2xl px-3 py-1.5 text-xs border transition-all ${
                localTicketTemplate === key
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]'
                  : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] hover:border-[var(--accent-soft)] hover:text-[var(--text)]'
              }`}
            >
              {key === 'simple' ? t('settings.ticketTemplateSimple') : key === 'minimal' ? t('settings.ticketTemplateMinimal') : t('settings.ticketTemplateFull')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
          {t('settings.ticketFooter')}
        </div>
        <textarea
          value={localTicketFooterLines}
          onChange={(e) => setLocalTicketFooterLines(e.target.value)}
          placeholder={t('settings.ticketFooterPlaceholder')}
          rows={4}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none resize-y"
        />
        <p className="text-xs text-[var(--muted)]">{t('settings.ticketFooterHint')}</p>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
          {t('settings.ticketPreview')}
        </div>
        <div className="rounded-2xl border-2 border-[var(--border)] bg-[#faf8f0] p-4 flex flex-col items-center">
          <pre className="text-[11px] text-[#1a1a1a] font-mono whitespace-pre leading-tight max-w-[320px] text-left overflow-x-auto bg-white/80 px-3 py-4 rounded-lg shadow-inner border border-[var(--border)] w-full">
            {previewText}
          </pre>
        </div>
      </div>

      <div className="space-y-2">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={localAutoPrint}
            onChange={(e) => setLocalAutoPrint(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border)] bg-[var(--panel-2)] text-[var(--accent)] focus:ring-[var(--accent)]/40"
          />
          <span className="text-sm text-[var(--text)]">{t('settings.autoPrint')}</span>
        </label>
      </div>

      <div className="pt-2">
        <LiquidButton onClick={handleSave}>
          {saved ? (
            <>
              <FaCheck className="text-sm" /> {t('settings.saved')}
            </>
          ) : (
            t('settings.savePrinter')
          )}
        </LiquidButton>
      </div>
    </div>
  )
}

