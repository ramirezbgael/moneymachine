import { create } from 'zustand'
import { t as translate } from '../i18n/translations'

const DEFAULT_NAV_MODULE_ORDER = ['inventory', 'customers', 'finance', 'pending', 'subscriptions', 'settings']
const NAV_MODULE_ORDER_ALLOWED = new Set(DEFAULT_NAV_MODULE_ORDER)

const sanitizeNavModuleOrder = (order) => {
  if (!Array.isArray(order)) return [...DEFAULT_NAV_MODULE_ORDER]

  const seen = new Set()
  const normalized = []

  order.forEach((id) => {
    if (!NAV_MODULE_ORDER_ALLOWED.has(id) || seen.has(id)) return
    seen.add(id)
    normalized.push(id)
  })

  DEFAULT_NAV_MODULE_ORDER.forEach((id) => {
    if (!seen.has(id)) normalized.push(id)
  })

  return normalized
}

/**
 * Settings store
 * Manages application settings and preferences
 */
export const useSettingsStore = create((set, get) => {
  // Load settings from localStorage
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('pos-settings')
      return saved ? JSON.parse(saved) : {}
    } catch (error) {
      console.error('Error loading settings:', error)
      return {}
    }
  }

  // Save settings to localStorage
  const saveSettings = (settings) => {
    try {
      localStorage.setItem('pos-settings', JSON.stringify(settings))
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const getPersistedSettings = (state, overrides = {}) => ({
    theme: state.theme,
    language: state.language,
    currency: state.currency,
    taxRate: state.taxRate,
    printerName: state.printerName,
    printerWidth: state.printerWidth,
    autoPrint: state.autoPrint,
    ticketTemplate: state.ticketTemplate,
    ticketFooterLines: state.ticketFooterLines,
    businessName: state.businessName,
    ticketIcon: state.ticketIcon,
    businessLogo: state.businessLogo,
    ticketPrintLogo: state.ticketPrintLogo,
    showFeaturedProducts: state.showFeaturedProducts,
    showPendingModule: state.showPendingModule,
    showSubscriptionsModule: state.showSubscriptionsModule,
    navModuleOrder: state.navModuleOrder,
    ...overrides
  })

  const initialSettings = loadSettings()

  return {
    // Settings state
    theme: initialSettings.theme || 'dark',
    language: initialSettings.language || 'en',
    currency: initialSettings.currency || 'USD',
    taxRate: initialSettings.taxRate || 0, // Tax rate as percentage (e.g., 16 for 16%)
    printerName: initialSettings.printerName || '',
    printerWidth: initialSettings.printerWidth || '80mm',
    autoPrint: initialSettings.autoPrint || false,
    ticketTemplate: initialSettings.ticketTemplate || 'simple',
    ticketFooterLines: initialSettings.ticketFooterLines || '',
    businessName: initialSettings.businessName || '',
    ticketIcon: initialSettings.ticketIcon || 'none',
    businessLogo: initialSettings.businessLogo || '',
    ticketPrintLogo: initialSettings.ticketPrintLogo !== false,
    showFeaturedProducts: initialSettings.showFeaturedProducts !== false,
    showPendingModule: initialSettings.showPendingModule !== false,
    showSubscriptionsModule: initialSettings.showSubscriptionsModule !== false,
    navModuleOrder: sanitizeNavModuleOrder(initialSettings.navModuleOrder),

    // Toggle featured products panel
    setShowFeaturedProducts: (value) => {
      set({ showFeaturedProducts: value })
      const currentState = get()
      saveSettings(getPersistedSettings(currentState, { showFeaturedProducts: value }))
    },
    setShowPendingModule: (value) => {
      set({ showPendingModule: value })
      const currentState = get()
      saveSettings(getPersistedSettings(currentState, { showPendingModule: value }))
    },
    setShowSubscriptionsModule: (value) => {
      set({ showSubscriptionsModule: value })
      const currentState = get()
      saveSettings(getPersistedSettings(currentState, { showSubscriptionsModule: value }))
    },
    setNavModuleOrder: (order) => {
      const nextOrder = sanitizeNavModuleOrder(order)
      set({ navModuleOrder: nextOrder })
      const currentState = get()
      saveSettings(getPersistedSettings(currentState, { navModuleOrder: nextOrder }))
    },
    setTheme: (theme) => {
      set({ theme })
      const currentState = get()
      saveSettings(getPersistedSettings(currentState))
      
      // Apply theme to document
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light')
      } else {
        document.documentElement.setAttribute('data-theme', 'dark')
      }
    },

    // Update language
    setLanguage: (language) => {
      set({ language })
      const currentState = get()
      saveSettings(getPersistedSettings(currentState))
    },

    // Update currency
    setCurrency: (currency) => {
      set({ currency })
      const currentState = get()
      saveSettings(getPersistedSettings(currentState))
    },

    // Update tax rate
    setTaxRate: (taxRate) => {
      const taxRateNum = parseFloat(taxRate) || 0
      set({ taxRate: taxRateNum })
      const currentState = get()
      saveSettings(getPersistedSettings(currentState))
    },

    // Update printer settings
    setPrinterSettings: (settings) => {
      set(settings)
      const currentState = get()
      saveSettings(getPersistedSettings(currentState))
    },

    initTheme: () => {
      const { theme } = get()
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light')
      } else {
        document.documentElement.setAttribute('data-theme', 'dark')
      }
    },

    // Get translation helper
    t: (key) => {
      const { language } = get()
      return translate(key, language)
    }
  }
})
