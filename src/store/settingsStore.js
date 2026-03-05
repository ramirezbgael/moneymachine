import { create } from 'zustand'
import { t as translate } from '../i18n/translations'

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

    // Update theme
    setTheme: (theme) => {
      set({ theme })
      const currentState = get()
      const settingsToSave = {
        theme: currentState.theme,
        language: currentState.language,
        currency: currentState.currency,
        taxRate: currentState.taxRate,
        printerName: currentState.printerName,
        printerWidth: currentState.printerWidth,
        autoPrint: currentState.autoPrint,
        ticketTemplate: currentState.ticketTemplate,
        ticketFooterLines: currentState.ticketFooterLines,
        businessName: currentState.businessName,
        ticketIcon: currentState.ticketIcon,
        businessLogo: currentState.businessLogo,
        ticketPrintLogo: currentState.ticketPrintLogo
      }
      saveSettings(settingsToSave)
      
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
      const settingsToSave = {
        theme: currentState.theme,
        language: currentState.language,
        currency: currentState.currency,
        taxRate: currentState.taxRate,
        printerName: currentState.printerName,
        printerWidth: currentState.printerWidth,
        autoPrint: currentState.autoPrint,
        ticketTemplate: currentState.ticketTemplate,
        ticketFooterLines: currentState.ticketFooterLines,
        businessName: currentState.businessName,
        ticketIcon: currentState.ticketIcon,
        businessLogo: currentState.businessLogo,
        ticketPrintLogo: currentState.ticketPrintLogo
      }
      saveSettings(settingsToSave)
    },

    // Update currency
    setCurrency: (currency) => {
      set({ currency })
      const currentState = get()
      const settingsToSave = {
        theme: currentState.theme,
        language: currentState.language,
        currency: currentState.currency,
        taxRate: currentState.taxRate,
        printerName: currentState.printerName,
        printerWidth: currentState.printerWidth,
        autoPrint: currentState.autoPrint,
        ticketTemplate: currentState.ticketTemplate,
        ticketFooterLines: currentState.ticketFooterLines,
        businessName: currentState.businessName,
        ticketIcon: currentState.ticketIcon,
        businessLogo: currentState.businessLogo,
        ticketPrintLogo: currentState.ticketPrintLogo
      }
      saveSettings(settingsToSave)
    },

    // Update tax rate
    setTaxRate: (taxRate) => {
      const taxRateNum = parseFloat(taxRate) || 0
      set({ taxRate: taxRateNum })
      const currentState = get()
      const settingsToSave = {
        theme: currentState.theme,
        language: currentState.language,
        currency: currentState.currency,
        taxRate: currentState.taxRate,
        printerName: currentState.printerName,
        printerWidth: currentState.printerWidth,
        autoPrint: currentState.autoPrint,
        ticketTemplate: currentState.ticketTemplate,
        ticketFooterLines: currentState.ticketFooterLines,
        businessName: currentState.businessName,
        ticketIcon: currentState.ticketIcon,
        businessLogo: currentState.businessLogo,
        ticketPrintLogo: currentState.ticketPrintLogo
      }
      saveSettings(settingsToSave)
    },

    // Update printer settings
    setPrinterSettings: (settings) => {
      set(settings)
      const currentState = get()
      const settingsToSave = {
        theme: currentState.theme,
        language: currentState.language,
        currency: currentState.currency,
        taxRate: currentState.taxRate,
        printerName: currentState.printerName,
        printerWidth: currentState.printerWidth,
        autoPrint: currentState.autoPrint,
        ticketTemplate: currentState.ticketTemplate,
        ticketFooterLines: currentState.ticketFooterLines,
        businessName: currentState.businessName,
        ticketIcon: currentState.ticketIcon,
        businessLogo: currentState.businessLogo,
        ticketPrintLogo: currentState.ticketPrintLogo
      }
      saveSettings(settingsToSave)
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
