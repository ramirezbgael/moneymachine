/**
 * Import Service
 * Parsea archivos de factura (XML CFDI, CSV, PDF) y devuelve datos para InvoiceReviewModal
 */

/** Extrae texto de un PDF usando pdfjs-dist (todas las páginas). */
async function extractTextFromPdf(arrayBuffer) {
  const pdfjsLib = await import('pdfjs-dist')
  try {
    const workerUrl = await import('pdfjs-dist/build/pdf.worker.mjs?url').then((m) => m.default)
    if (workerUrl) pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
  } catch (_) {
    // Worker opcional; puede correr en main thread
  }
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const doc = await loadingTask.promise
  const numPages = doc.numPages
  const parts = []
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((it) => it.str || '').join(' ')
    parts.push(pageText)
  }
  return parts.join('\n')
}

/**
 * Parsea texto extraído de un PDF de factura (CFDI u otro).
 * Acepta tanto tablas (columnas con 2+ espacios/tabs) como líneas con espacios simples.
 */
function parsePDFText(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const items = []
  const headerLike = /^(cantidad|descripción|descripcion|concepto|clave|valor|unitario|importe|subtotal|total|iva|p\.?\s*unit|pza|pieza|unidad|no\.?\s*ident|código|codigo)\s*$/i
  let supplier = ''
  let folio = ''

  for (const line of lines) {
    if (line.length < 2) continue
    if (/folio|uuid|rfc\s*:|razón\s*social|razon\s*social/i.test(line)) {
      if (/folio/i.test(line)) folio = (line.match(/[\dA-Z-]{8,}/i) || [])[0] || folio
      if (/razón|razon\s*social|rfc/i.test(line)) supplier = line.replace(/^(rfc|razón\s*social|razon\s*social)\s*:?\s*/i, '').trim().slice(0, 200) || supplier
      continue
    }
    if (/subtotal|total\s+general|iva\s+retenido|impuesto/i.test(line)) continue

    const tokensBySpaces = line.split(/\s{2,}|\t/).filter(Boolean)
    const numbers = line.match(/\d+[,.]?\d*/g) || []
    const numericValues = numbers.map((n) => parseFloat(n.replace(',', '.'))).filter((v) => v > 0 && v < 1e7)
    if (numericValues.length < 1) continue

    const firstToken = (tokensBySpaces[0] || '').trim()
    if (headerLike.test(firstToken) || /^cantidad\s*descripción/i.test(line)) continue

    let numericTokens, descParts
    if (tokensBySpaces.length >= 2) {
      numericTokens = tokensBySpaces.filter((t) => /^\d+[,.]?\d*$/.test(String(t).replace(/,/g, '.')))
      descParts = tokensBySpaces.filter((t) => {
        const s = String(t).trim()
        return s && !/^\d+[,.]?\d*$/.test(s.replace(/,/g, '.')) && !/^\$|^\d+[,.]?\d*%?$/.test(s)
      })
    } else {
      const singleSpaceTokens = line.split(/\s+/).filter(Boolean)
      const numIndices = []
      singleSpaceTokens.forEach((t, i) => {
        if (/^\d+[,.]?\d*$/.test(String(t).replace(/,/g, '.'))) numIndices.push(i)
      })
      if (numIndices.length < 1) continue
      numericTokens = numIndices.map((i) => singleSpaceTokens[i])
      const firstNumIdx = numIndices[0]
      const lastNumIdx = numIndices[numIndices.length - 1]
      descParts = singleSpaceTokens.slice(firstNumIdx + 1, lastNumIdx)
    }

    const description = descParts.join(' ').trim()
    if (description.length < 2) continue

    const qty = parseFloat(numericTokens[0]?.replace(',', '.') || '1') || 1
    const unitPrice = parseFloat(numericTokens[1]?.replace(',', '.') || numericTokens[0]?.replace(',', '.') || '0') || 0
    const amount = parseFloat(numericTokens[2]?.replace(',', '.') || numericTokens[1]?.replace(',', '.') || String(unitPrice * qty)) || unitPrice * qty
    const price = unitPrice > 0 ? unitPrice : (qty ? amount / qty : 0)
    items.push({
      name: description,
      description,
      code: `PDF-${Date.now()}-${items.length}`,
      barcode: '',
      price: price || 0,
      cost: price || 0,
      stock: qty,
    })
  }

  if (items.length === 0) {
    tryFallbackRowRegex(text, items)
  }

  return { items, supplier: supplier || '', folio: folio || '' }
}

/**
 * Fallback: busca en todo el texto patrones tipo "cantidad descripción precio importe"
 * (útil cuando el PDF devuelve una sola línea por página).
 */
function tryFallbackRowRegex(text, items) {
  const rowRegex = /(\d+(?:[.,]\d+)?)\s+([A-Za-zÁ-úÑñ0-9\s\-\.\/]+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)(?=\s|$)/g
  let m
  const seen = new Set()
  while ((m = rowRegex.exec(text)) !== null) {
    const desc = m[2].trim()
    if (desc.length < 2) continue
    if (/cantidad|descripción|subtotal|total|importe|valor\s*unit/i.test(desc)) continue
    const qty = parseFloat(m[1].replace(',', '.')) || 1
    const num3 = parseFloat(m[3].replace(',', '.'))
    const num4 = parseFloat(m[4].replace(',', '.'))
    if (num3 <= 0 && num4 <= 0) continue
    const unitPrice = num3 > 0 && num3 < 1e6 ? num3 : (qty > 0 ? num4 / qty : num4)
    const amount = num4 > 0 ? num4 : unitPrice * qty
    const key = `${desc.slice(0, 30)}-${unitPrice}-${amount}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      name: desc,
      description: desc,
      code: `PDF-${Date.now()}-${items.length}`,
      barcode: '',
      price: unitPrice,
      cost: unitPrice,
      stock: qty,
    })
  }
}

/**
 * Parsea XML CFDI (México) y devuelve { items, supplier, folio } o { _parsingError }
 */
function parseXML(text) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error('XML inválido')

  const conceptos = doc.querySelectorAll('Concepto') || doc.getElementsByTagName?.('concepto') || []
  const byLocalName = doc.getElementsByTagName('*')
  let conceptosList = []
  for (let i = 0; i < byLocalName.length; i++) {
    const el = byLocalName[i]
    const local = (el.localName || el.tagName || '').toLowerCase()
    if (local === 'concepto') conceptosList.push(el)
  }
  if (conceptos.length > conceptosList.length) conceptosList = Array.from(conceptos)

  const items = []
  for (const c of conceptosList) {
    const get = (name) => c.getAttribute?.(name) || c.getAttribute?.(name.toLowerCase()) || ''
    const desc = get('Descripcion') || get('descripcion') || (c.textContent || '').trim() || ''
    const cantidad = parseFloat(get('Cantidad') || get('cantidad') || '1') || 1
    const valorUnitario = parseFloat((get('ValorUnitario') || get('valorunitario') || '0').replace(',', '')) || 0
    const importe = parseFloat((get('Importe') || get('importe') || '0').replace(',', '')) || valorUnitario * cantidad
    const clave = get('NoIdentificacion') || get('ClaveProdServ') || get('claveprodserv') || ''
    const unidad = get('ClaveUnidad') || get('Unidad') || get('claveunidad') || 'PZA'
    if (!desc) continue
    items.push({
      name: desc,
      description: desc,
      code: clave,
      barcode: clave,
      price: valorUnitario,
      cost: valorUnitario,
      stock: cantidad,
    })
  }

  const comprobante = doc.querySelector('Comprobante') || doc.querySelector('*[local-name()="Comprobante"]') || doc.documentElement
  const emisor = doc.querySelector('Emisor') || doc.querySelector('*[local-name()="Emisor"]')
  const getAttr = (el, name) => el?.getAttribute?.(name) || el?.getAttribute?.(name.toLowerCase()) || ''
  const supplier = emisor ? (getAttr(emisor, 'Nombre') || getAttr(emisor, 'nombre')) : ''
  const folio = comprobante ? (getAttr(comprobante, 'Folio') || getAttr(comprobante, 'folio')) : ''

  return { items, supplier, folio }
}

/**
 * Parsea CSV con headers (nombre/name/producto, codigo/code/sku, precio/price, costo/cost, stock/cantidad)
 */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) throw new Error('CSV vacío o sin filas')
  const sep = text.includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase())
  const nameIdx = headers.findIndex((h) => /nombre|name|producto|descripcion/.test(h))
  const codeIdx = headers.findIndex((h) => /codigo|code|sku|barcode/.test(h))
  const priceIdx = headers.findIndex((h) => /precio|price|venta/.test(h))
  const costIdx = headers.findIndex((h) => /costo|cost|compra/.test(h))
  const stockIdx = headers.findIndex((h) => /stock|cantidad|quantity/.test(h))
  if (nameIdx < 0) throw new Error('CSV debe tener columna de nombre o producto')
  const items = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim())
    const name = (cells[nameIdx] || '').trim()
    if (!name) continue
    const code = codeIdx >= 0 ? (cells[codeIdx] || '').trim() : ''
    const price = parseFloat((cells[priceIdx] || '0').replace(/[^\d.-]/g, '')) || 0
    const cost = parseFloat((cells[costIdx] || '0').replace(/[^\d.-]/g, '')) || price
    const stock = parseFloat((cells[stockIdx] || '1').replace(/[^\d.-]/g, '')) || 1
    items.push({
      name,
      description: name,
      code: code || `IMP-${Date.now()}-${i}`,
      barcode: code,
      price: price || cost,
      cost,
      stock,
    })
  }
  return { items, supplier: '', folio: '' }
}

/**
 * Parsea un archivo (File) y devuelve objeto para InvoiceReviewModal: { items, supplier, folio } o { _parsingError }
 */
export async function importProducts(file) {
  if (!file) return { _parsingError: 'No se seleccionó archivo' }
  const name = (file.name || '').toLowerCase()
  const isXml = name.endsWith('.xml')
  const isCsv = name.endsWith('.csv')
  const isPdf = name.endsWith('.pdf')

  try {
    if (isPdf) {
      const buffer = await readFileAsArrayBuffer(file)
      if (!buffer || !buffer.byteLength) return { _parsingError: 'No se pudo leer el PDF' }
      const text = await extractTextFromPdf(buffer)
      if (!text || !text.trim()) return { _parsingError: 'El PDF no contiene texto extraíble (puede ser solo imagen). Use XML (CFDI) o CSV.' }
      const data = parsePDFText(text)
      if (!data.items || data.items.length === 0) return { _parsingError: 'No se detectaron partidas en el PDF. Pruebe con XML (CFDI) o CSV.' }
      return data
    }

    const text = await readFileAsText(file)
    if (!text) return { _parsingError: 'No se pudo leer el archivo' }

    if (isXml) {
      const data = parseXML(text)
      if (!data.items || data.items.length === 0) return { _parsingError: 'No se encontraron conceptos en el XML' }
      return data
    }
    if (isCsv) {
      const data = parseCSV(text)
      if (!data.items || data.items.length === 0) return { _parsingError: 'No se encontraron filas válidas en el CSV' }
      return data
    }
    return { _parsingError: 'Formato no soportado. Use archivo XML (CFDI), CSV o PDF.' }
  } catch (err) {
    return { _parsingError: err?.message || 'Error al procesar el archivo' }
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result ?? '')
    reader.onerror = () => reject(new Error('Error leyendo archivo'))
    reader.readAsText(file, 'UTF-8')
  })
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result ?? null)
    reader.onerror = () => reject(new Error('Error leyendo archivo'))
    reader.readAsArrayBuffer(file)
  })
}
