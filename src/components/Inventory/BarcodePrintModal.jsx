import React, { useState, useEffect, useRef, useCallback } from 'react'
import { FaTimes, FaPrint } from 'react-icons/fa'
import { useInventoryStore } from '../../store/inventoryStore'
import { useSettingsStore } from '../../store/settingsStore'
import { printBarcodeLabels, isTauri } from '../../services/printerService'
import '../Modal/Modal.css'
import './BarcodePrintModal.css'

// Cargar JsBarcode desde CDN para no depender de npm (evita error de Vite si no está instalado)
let JsBarcodeLib = null
function getJsBarcodeFn() {
  const g = typeof window !== 'undefined' ? window.JsBarcode : null
  if (typeof g === 'function') return g
  if (g && typeof g.default === 'function') return g.default
  return null
}
function loadJsBarcode() {
  if (JsBarcodeLib) return Promise.resolve(JsBarcodeLib)
  if (typeof window === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const existing = getJsBarcodeFn()
    if (existing) {
      JsBarcodeLib = existing
      return resolve(JsBarcodeLib)
    }
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/jsbarcode@3.11.5/dist/JsBarcode.all.min.js'
    script.async = true
    script.onload = () => {
      JsBarcodeLib = getJsBarcodeFn()
      resolve(JsBarcodeLib)
    }
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
}

/**
 * Modal: seleccionar productos, generar código de barras e imprimir en la impresora de tickets.
 */
export default function BarcodePrintModal({ onClose }) {
  const { products, fetchProducts } = useInventoryStore()
  const printerName = useSettingsStore((s) => s.printerName) || ''
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState(null)
  const [jsbarcodeReady, setJsbarcodeReady] = useState(null)
  const listRef = useRef(null)

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    loadJsBarcode().then((lib) => {
      JsBarcodeLib = lib || null
      setJsbarcodeReady(!!lib)
    })
  }, [])

  const filtered = products.filter((p) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q)
    )
  })

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)))
    }
  }

  const getBarcodeValue = (p) => {
    const code = (p.barcode || p.code || '').toString().trim()
    if (code) return code
    return String(p.id)
  }

  // Dibujar códigos de barras en los canvas de la lista (diferido para que el DOM esté montado)
  useEffect(() => {
    if (!JsBarcodeLib || !listRef.current) return
    const id = setTimeout(() => {
      const list = listRef.current
      if (!list) return
      const canvases = list.querySelectorAll('canvas[data-value]')
      const opts = {
        format: 'CODE128',
        width: 1.5,
        height: 32,
        displayValue: true,
        margin: 2,
        fontSize: 10,
      }
      canvases.forEach((canvas) => {
        const value = canvas.getAttribute('data-value')
        if (!value) return
        if (canvas.nodeName !== 'CANVAS' || !canvas.isConnected) return
        try {
          JsBarcodeLib(canvas, value, opts)
        } catch (_) {}
      })
    }, 150)
    return () => clearTimeout(id)
  }, [filtered, jsbarcodeReady])

  const generateBarcodeDataUrl = useCallback((value) => {
    if (!JsBarcodeLib) return null
    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.left = '-9999px'
    document.body.appendChild(canvas)
    try {
      JsBarcodeLib(canvas, value, {
        format: 'CODE128',
        width: 2,
        height: 48,
        displayValue: false,
        margin: 4,
      })
      return canvas.toDataURL('image/png')
    } catch (e) {
      return null
    } finally {
      canvas.remove()
    }
  }, [jsbarcodeReady])

  const handlePrint = async () => {
    if (selectedIds.size === 0) {
      setError('Selecciona al menos un producto.')
      return
    }
    if (!isTauri()) {
      setError('Solo puedes imprimir etiquetas desde la app de escritorio (Tauri).')
      return
    }
    setError(null)
    setPrinting(true)
    try {
      const selected = products.filter((p) => selectedIds.has(p.id))
      const labels = []
      for (const p of selected) {
        const value = getBarcodeValue(p)
        const dataUrl = generateBarcodeDataUrl(value)
        labels.push({
          barcodeValue: value,
          barcodeImageBase64: dataUrl || undefined,
          productName: (p.name || '').slice(0, 32),
        })
      }
      await printBarcodeLabels(labels, printerName)
      onClose()
    } catch (e) {
      setError(e?.message || 'Error al imprimir')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal barcode-print-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Etiquetas de código de barras</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <FaTimes />
          </button>
        </div>
        <div className="modal__content">
          {jsbarcodeReady === null && <p className="barcode-print-modal__hint">Cargando…</p>}
          {jsbarcodeReady === false && (
            <p className="barcode-print-modal__error">
              No se pudo cargar el generador de códigos de barras. Comprueba la conexión a internet.
            </p>
          )}
          {jsbarcodeReady && (
          <>
          <p className="barcode-print-modal__hint">
            Elige los productos y se imprimirán en la misma impresora de tickets (una etiqueta por producto).
          </p>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="barcode-print-modal__search"
            aria-label="Buscar"
          />
          <div className="barcode-print-modal__toolbar">
            <button type="button" className="barcode-print-modal__select-all" onClick={selectAll}>
              {selectedIds.size === filtered.length ? 'Quitar todos' : 'Seleccionar todos'}
            </button>
            <span className="barcode-print-modal__count">
              {selectedIds.size} de {filtered.length} seleccionados
            </span>
          </div>
          <div className="barcode-print-modal__list" ref={listRef}>
            {filtered.length === 0 ? (
              <p className="barcode-print-modal__empty">No hay productos o no coinciden con la búsqueda.</p>
            ) : (
              filtered.map((p) => {
                const code = getBarcodeValue(p)
                const checked = selectedIds.has(p.id)
                return (
                  <label key={p.id} className={`barcode-print-modal__row ${checked ? 'barcode-print-modal__row--selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(p.id)}
                      className="barcode-print-modal__check"
                    />
                    <div className="barcode-print-modal__preview">
                      <canvas data-value={code} className="barcode-print-modal__canvas" width={200} height={44} />
                    </div>
                    <div className="barcode-print-modal__info">
                      <span className="barcode-print-modal__name">{p.name || 'Sin nombre'}</span>
                      <span className="barcode-print-modal__code">{code}</span>
                    </div>
                  </label>
                )
              })
            )}
          </div>
          {error && <p className="barcode-print-modal__error">{error}</p>}
          </>
          )}
        </div>
        <div className="modal__footer">
          <button type="button" className="modal__btn modal__btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="modal__btn modal__btn--primary"
            onClick={handlePrint}
            disabled={!jsbarcodeReady || printing || selectedIds.size === 0}
          >
            <FaPrint />
            {printing ? 'Imprimiendo…' : 'Imprimir en impresora de tickets'}
          </button>
        </div>
      </div>
    </div>
  )
}
