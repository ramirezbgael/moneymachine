/**
 * Printer service
 * - In Tauri: sends ticket to selected printer via native command (no dialog, no new tab).
 * - In browser: opens print dialog in a new window (fallback).
 */

export function isTauri() {
  return typeof window !== 'undefined' && (
    window.__TAURI_INTERNALS__ != null ||
    (window.__TAURI__ != null && window.__TAURI__.core != null)
  )
}

function getTicketSettings() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem('pos-settings')
    const s = raw ? JSON.parse(raw) : {}
    return {
      ticketTemplate: s.ticketTemplate || 'simple',
      ticketFooterLines: s.ticketFooterLines || '',
      businessName: s.businessName || '',
      ticketIcon: s.ticketIcon || 'none',
      businessLogo: s.businessLogo || '',
      ticketPrintLogo: s.ticketPrintLogo !== false
    }
  } catch {
    return { ticketTemplate: 'simple', ticketFooterLines: '', businessName: '', ticketIcon: 'none', businessLogo: '', ticketPrintLogo: true }
  }
}

const TICKET_WIDTH = 32
function centerLine(str, width = TICKET_WIDTH) {
  const s = String(str).slice(0, width)
  const pad = Math.max(0, Math.floor((width - s.length) / 2))
  return (' '.repeat(pad) + s + ' '.repeat(width - pad - s.length)).slice(0, width)
}

// Logos ASCII para ticket (32 chars) — formas simples y legibles
const TICKET_ICONS = {
  tools: ['+---+', '| + |', '+---+'].map((line) => centerLine(line)),
  florist: ['  *  ', ' *** ', '*****', ' *** ', '  *  '].map((line) => centerLine(line)),
  beauty: ['\\   /', ' \\ / ', '  X  ', ' / \\ ', '/   \\'].map((line) => centerLine(line))
}

/** Quita acentos para impresora térmica (evita Ã y otros caracteres raros) */
function toAsciiSafe(str) {
  if (typeof str !== 'string') return str
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n')
}

/** Aplica toAsciiSafe a cada línea del ticket para evitar problemas de encoding */
function ticketLinesToAscii(lines) {
  return lines.map((line) => toAsciiSafe(line))
}

/**
 * Generate plain text ticket for thermal/native printing (Tauri).
 * Uses template, footer, business name and icon from Configuración → Impresora.
 * @param {Object} sale - Sale data
 * @param {Object} [overrides] - Optional for preview: { businessName, ticketIcon, ticketTemplate, ticketFooterLines }
 */
export function getTicketText(sale, overrides = {}) {
  const stored = getTicketSettings()
  const ticketTemplate = overrides.ticketTemplate ?? stored.ticketTemplate
  const ticketFooterLines = overrides.ticketFooterLines ?? stored.ticketFooterLines
  const businessName = (overrides.businessName ?? stored.businessName) || ''
  const ticketIcon = overrides.ticketIcon ?? stored.ticketIcon
  const title = businessName.trim() || 'TICKET'
  const sep = '-'.repeat(TICKET_WIDTH)
  const lines = []

  const iconLines = ticketIcon && ticketIcon !== 'none' && TICKET_ICONS[ticketIcon]

  // --- Header: logo (si hay) + nombre de tienda ---
  if (ticketTemplate === 'minimal') {
    if (iconLines) iconLines.forEach((line) => lines.push(line))
    lines.push(centerLine(title))
    lines.push(`#${sale.sale_number || sale.id || 'N/A'}  ${new Date(sale.created_at || Date.now()).toLocaleString()}`)
    lines.push(`Pago: ${sale.payment_method || sale.paymentMethod || 'N/A'}`)
    lines.push('')
  } else {
    lines.push(sep)
    if (iconLines) {
      iconLines.forEach((line) => lines.push(line))
      lines.push(''.padEnd(TICKET_WIDTH))
    }
    lines.push(centerLine(title))
    lines.push(sep)
    lines.push(`Ticket #${sale.sale_number || sale.id || 'N/A'}`)
    lines.push(`Fecha: ${new Date(sale.created_at || Date.now()).toLocaleString()}`)
    lines.push(`Pago: ${sale.payment_method || sale.paymentMethod || 'N/A'}`)
    lines.push(sep)
    if (ticketTemplate === 'full') {
      lines.push('Conserve este ticket')
      lines.push(sep)
    }
  }

  // --- Items --- (32 chars por línea; descripción en 2-3 líneas; P.Unit y Total a la izq, con decimales)
  const TICKET_W = 32
  const NAME_W = 10
  const NAME_LINES = 3
  const CANT_W = 4
  const UNIT_W = 6
  const PRICE_W = 6

  lines.push('Cant Producto  P.Unit Total'.padEnd(TICKET_W).slice(0, TICKET_W))
  if (ticketTemplate !== 'minimal') lines.push(sep)

  function wrapName(str) {
    const s = (str || 'N/A').trim()
    const out = []
    for (let i = 0; i < NAME_LINES && i * NAME_W < s.length; i++) {
      out.push(s.slice(i * NAME_W, (i + 1) * NAME_W).padEnd(NAME_W))
    }
    if (out.length === 0) out.push('N/A'.padEnd(NAME_W))
    return out
  }

  const items = sale.items || sale.sale_items || []
  items.forEach((item) => {
    const nameLines = wrapName(item.product?.name || 'N/A')
    const qty = String(item.quantity).padStart(CANT_W)
    const unit = `$${Number(item.unitPrice ?? item.unit_price ?? 0).toFixed(2)}`.padStart(UNIT_W)
    const tot = `$${Number(item.subtotal ?? 0).toFixed(2)}`.padStart(PRICE_W)
    const priceBlock = '   ' + unit + '  ' + tot
    nameLines.forEach((namePart, i) => {
      const left = i === 0 ? qty + ' ' : ' '.repeat(CANT_W + 1)
      const line = left + namePart + (i === nameLines.length - 1 ? priceBlock : '')
      lines.push(line.slice(0, TICKET_W).padEnd(TICKET_W))
    })
  })

  // --- Totals ---
  if (ticketTemplate !== 'minimal') lines.push(sep)
  lines.push(`Subtotal:                $${(sale.subtotal ?? 0).toFixed(2)}`)
  if (sale.tax > 0) lines.push(`Impuesto:                $${(sale.tax ?? 0).toFixed(2)}`)
  if (ticketTemplate !== 'minimal') lines.push(sep)
  lines.push(`TOTAL:                   $${(sale.total ?? 0).toFixed(2)}`)
  lines.push(sep)

  // --- Custom footer lines from settings ---
  const footerLines = (ticketFooterLines || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  footerLines.forEach((l) => lines.push(l))

  // --- Closing ---
  lines.push('   Gracias por su compra')
  lines.push(sep)
  // Dos renglones al final para que no se corte el ticket
  lines.push('')
  lines.push('')
  const safeLines = ticketLinesToAscii(lines)
  return safeLines.join('\r\n')
}

/**
 * Print ticket
 * @param {Object} sale - Sale data to print
 * @param {{ printerName?: string, printerWidth?: string }} options - Optional. In Tauri, printerName is sent to the selected printer.
 * @returns {Promise<boolean>}
 */
export const printTicket = async (sale, options = {}) => {
  const { printerName = '', printerWidth } = options

  try {
    if (isTauri()) {
      const ticketText = getTicketText(sale)
      const settings = getTicketSettings()
      const ticketLogoBase64 =
        settings.ticketPrintLogo && settings.businessLogo && String(settings.businessLogo).trim()
          ? settings.businessLogo
          : null
      let invoke
      try {
        const api = await import('@tauri-apps/api/core')
        invoke = api.invoke
      } catch {
        invoke = window.__TAURI__?.core?.invoke
      }
      if (typeof invoke !== 'function') {
        throw new Error('Tauri invoke no disponible')
      }
      await invoke('print_ticket', {
        printerName: printerName || '',
        ticketText,
        ticketLogoBase64
      })
      return true
    }

    // En el navegador no usar window.print() hacia térmica: el sistema envía PostScript
    // y la impresora imprime basura. Ofrecer ticket en texto para copiar o usar app escritorio.
    const err = new Error(
      'En el navegador no se puede imprimir directo a impresora térmica (sale código PostScript). ' +
      'Usa la app de escritorio para imprimir, o copia el ticket.'
    )
    err.code = 'BROWSER_THERMAL_UNSUPPORTED'
    err.ticketText = getTicketText(sale)
    throw err
  } catch (error) {
    console.error('Print error:', error)
    throw error
  }
}

/**
 * Generate ticket HTML
 */
const generateTicketHTML = (sale) => {
  const itemsHTML = sale.items?.map(item => `
    <tr>
      <td>${item.quantity}</td>
      <td>${item.product?.name || 'N/A'}</td>
      <td>$${item.unitPrice?.toFixed(2) || '0.00'}</td>
      <td>$${item.subtotal?.toFixed(2) || '0.00'}</td>
    </tr>
  `).join('') || ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket - ${sale.sale_number || 'Sale'}</title>
      <style>
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 10mm;
            font-size: 12px;
          }
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          max-width: 80mm;
          margin: 0 auto;
          padding: 10mm;
        }
        .header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .info {
          margin: 10px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        th, td {
          padding: 5px;
          text-align: left;
          border-bottom: 1px dashed #ccc;
        }
        th {
          font-weight: bold;
        }
        .total {
          text-align: right;
          font-weight: bold;
          font-size: 14px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #000;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px dashed #000;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>POS SYSTEM</h2>
        <p>Ticket #${sale.sale_number || sale.id || 'N/A'}</p>
      </div>
      
      <div class="info">
        <p>Date: ${new Date(sale.created_at || Date.now()).toLocaleString()}</p>
        <p>Payment: ${sale.paymentMethod || 'N/A'}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Qty</th>
            <th>Product</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="total">
        <p>Subtotal: $${sale.subtotal?.toFixed(2) || '0.00'}</p>
        ${sale.tax > 0 ? `<p>Tax: $${sale.tax.toFixed(2)}</p>` : ''}
        <p>TOTAL: $${sale.total?.toFixed(2) || '0.00'}</p>
      </div>

      <div class="footer">
        <p>Thank you for your purchase!</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Check if printer is available
 */
export const isPrinterAvailable = () => {
  // In production, check actual printer availability
  return typeof window !== 'undefined' && window.print !== undefined
}

/**
 * Print barcode labels to the same thermal printer as tickets (Tauri only).
 * @param {Array<{ barcodeImageBase64: string, productName: string }>} labels
 * @param {string} [printerName]
 */
export async function printBarcodeLabels(labels, printerName = '') {
  if (!isTauri()) {
    throw new Error('Impresión de etiquetas solo disponible en la app de escritorio.')
  }
  if (!labels?.length) {
    throw new Error('No hay etiquetas para imprimir.')
  }
  let invoke
  try {
    const api = await import('@tauri-apps/api/core')
    invoke = api.invoke
  } catch {
    invoke = window.__TAURI__?.core?.invoke
  }
  if (typeof invoke !== 'function') {
    throw new Error('Tauri invoke no disponible')
  }
  await invoke('print_barcode_labels', {
    printerName: printerName || '',
    labels: labels.map((l) => ({
      barcode_value: l.barcodeValue || null,
      barcode_image_base64: (l.barcodeImageBase64 || '').replace(/^data:image\/\w+;base64,/, '') || null,
      product_name: l.productName || '',
    })),
  })
}