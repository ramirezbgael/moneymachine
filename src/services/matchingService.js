/**
 * Matching Service
 * Provides fuzzy matching between invoice items and existing products
 */
import { productService } from './productService'

/**
 * Calculate Levenshtein distance between two strings
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = []
  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0) return len2
  if (len2 === 0) return len1

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[len2][len1]
}

/**
 * Calculate similarity score between two strings (0-1)
 */
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0
  
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  if (s1 === s2) return 1
  
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1
  
  const distance = levenshteinDistance(s1, s2)
  return 1 - (distance / maxLen)
}

/**
 * Normalize text for matching (remove accents, special chars, etc)
 */
const normalizeText = (text) => {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .trim()
}

/**
 * Find best matches for an invoice item
 */
export const findMatches = async (invoiceItem, existingProducts) => {
  if (!invoiceItem || !invoiceItem.name) {
    return []
  }

  const itemName = normalizeText(invoiceItem.name)
  const itemCode = invoiceItem.code ? normalizeText(invoiceItem.code) : ''
  const itemBarcode = invoiceItem.barcode ? normalizeText(invoiceItem.barcode) : ''

  const matches = []

  for (const product of existingProducts) {
    let score = 0
    let matchType = 'none'
    let confidence = 'low'

    // Exact code match (highest priority)
    if (itemCode && product.code) {
      const codeSimilarity = calculateSimilarity(itemCode, normalizeText(product.code))
      if (codeSimilarity === 1) {
        score = 0.95
        matchType = 'code_exact'
        confidence = 'high'
      } else if (codeSimilarity > 0.8) {
        score = Math.max(score, codeSimilarity * 0.9)
        matchType = 'code_similar'
        confidence = 'high'
      }
    }

    // Barcode match
    if (itemBarcode && product.barcode) {
      const barcodeSimilarity = calculateSimilarity(itemBarcode, normalizeText(product.barcode))
      if (barcodeSimilarity === 1) {
        score = Math.max(score, 0.9)
        matchType = matchType === 'none' ? 'barcode_exact' : matchType
        confidence = 'high'
      }
    }

    // Name similarity
    if (product.name) {
      const nameSimilarity = calculateSimilarity(itemName, normalizeText(product.name))
      
      // Exact or very close name match
      if (nameSimilarity >= 0.9) {
        score = Math.max(score, nameSimilarity * 0.85)
        matchType = matchType === 'none' ? 'name_exact' : matchType
        confidence = nameSimilarity >= 0.95 ? 'high' : 'medium'
      } else if (nameSimilarity >= 0.7) {
        score = Math.max(score, nameSimilarity * 0.7)
        matchType = matchType === 'none' ? 'name_similar' : matchType
        confidence = 'medium'
      } else if (nameSimilarity >= 0.5) {
        score = Math.max(score, nameSimilarity * 0.5)
        matchType = matchType === 'none' ? 'name_partial' : matchType
        confidence = 'low'
      }
    }

    // Description similarity (lower weight)
    if (product.description && itemName.length > 10) {
      const descSimilarity = calculateSimilarity(itemName, normalizeText(product.description))
      if (descSimilarity > 0.7 && score < 0.6) {
        score = Math.max(score, descSimilarity * 0.4)
        matchType = matchType === 'none' ? 'description' : matchType
        confidence = 'low'
      }
    }

    if (score > 0.3) {
      matches.push({
        product,
        score,
        matchType,
        confidence,
        similarity: score
      })
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score)

  return matches.slice(0, 5) // Return top 5 matches
}

/**
 * Get confidence level color/class
 */
export const getConfidenceColor = (confidence) => {
  switch (confidence) {
    case 'high':
      return '#10b981' // green
    case 'medium':
      return '#f59e0b' // yellow
    case 'low':
      return '#ef4444' // red
    default:
      return '#6b7280' // gray
  }
}

/**
 * Get confidence label
 */
export const getConfidenceLabel = (confidence) => {
  switch (confidence) {
    case 'high':
      return 'Alta'
    case 'medium':
      return 'Media'
    case 'low':
      return 'Baja'
    default:
      return 'N/A'
  }
}

/**
 * Match invoice items with existing products
 */
export const matchInvoiceItems = async (invoiceItems) => {
  // Get all existing products
  const existingProducts = await productService.getAll()
  
  const matchedItems = []
  
  for (const item of invoiceItems) {
    const matches = await findMatches(item, existingProducts)
    const bestMatch = matches.length > 0 ? matches[0] : null
    
    // For LOW confidence matches, suggest creating new product instead
    const shouldSuggestNew = bestMatch && bestMatch.confidence === 'low'
    
    matchedItems.push({
      ...item,
      matches,
      bestMatch: shouldSuggestNew ? null : bestMatch, // Keep bestMatch for reference but don't auto-select
      selectedProduct: shouldSuggestNew ? null : (bestMatch?.product || null),
      action: shouldSuggestNew ? 'new' : (bestMatch ? 'match' : 'new'), // 'match', 'new', 'manual'
      isConfirmed: false,
      _lowConfidenceWarning: shouldSuggestNew // Flag to show warning in UI
    })
  }
  
  return matchedItems
}

export const matchingService = {
  findMatches,
  matchInvoiceItems,
  getConfidenceColor,
  getConfidenceLabel,
  calculateSimilarity
}
