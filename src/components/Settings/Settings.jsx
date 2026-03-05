import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { FaMoon, FaSun, FaPrint, FaGlobe, FaDollarSign, FaCheck } from 'react-icons/fa'
import './Settings.css'

/**
 * Settings view component
 * System configuration and user settings
 */
const Settings = () => {
  const { signOut, user } = useAuthStore()
  const {
    theme,
    language,
    currency,
    taxRate,
    printerName,
    printerWidth,
    autoPrint,
    setTheme,
    setLanguage,
    setCurrency,
    setTaxRate,
    setPrinterSettings,
    t
  } = useSettingsStore()

  const [localTaxRate, setLocalTaxRate] = useState(taxRate || 0)
  const [localPrinterName, setLocalPrinterName] = useState(printerName)
  const [localPrinterWidth, setLocalPrinterWidth] = useState(printerWidth)
  const [localAutoPrint, setLocalAutoPrint] = useState(autoPrint)
  const [printerSaved, setPrinterSaved] = useState(false)
  const [availablePrinters, setAvailablePrinters] = useState([])
  const [detectingPrinters, setDetectingPrinters] = useState(false)
  const [printerError, setPrinterError] = useState('')

  useEffect(() => {
    setLocalTaxRate(taxRate || 0)
    setLocalPrinterName(printerName)
    setLocalPrinterWidth(printerWidth)
    setLocalAutoPrint(autoPrint)
    detectPrinters()
  }, [taxRate, printerName, printerWidth, autoPrint])

  const detectPrinters = async () => {
    setDetectingPrinters(true)
    setPrinterError('')
    setAvailablePrinters([])
    
    console.log('🔍 Starting printer detection...')
    
    try {
      // 1. Try Tauri API (if running in Tauri app v2)
      try {
        console.log('📱 Trying Tauri v2 API...')
        const { invoke } = await import('@tauri-apps/api/core')
        const printers = await invoke('get_printers')
        console.log('✅ Tauri v2 response:', printers)
        
        if (printers && Array.isArray(printers) && printers.length > 0) {
          console.log(`✅ Found ${printers.length} printer(s) via Tauri v2`)
          setAvailablePrinters(printers)
          return
        } else {
          console.log('⚠️ Tauri v2 returned empty printer list')
        }
      } catch (tauriError) {
        // Tauri not available - this is expected in browser, don't log as error
        // Tauri not available or v1 API, try v1
        if (window.__TAURI__) {
          try {
            console.log('📱 Trying Tauri v1 API...')
            const { invoke } = window.__TAURI__.core
            const printers = await invoke('get_printers')
            console.log('✅ Tauri v1 response:', printers)
            
            if (printers && Array.isArray(printers) && printers.length > 0) {
              console.log(`✅ Found ${printers.length} printer(s) via Tauri v1`)
              setAvailablePrinters(printers)
              return
            }
          } catch (v1Error) {
            // Tauri v1 not available - expected in browser
          }
        }
      }
      
      // 2. Try local printer service (Node.js service)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout
        
        const response = await fetch('http://localhost:3001/api/printers', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const { printers } = await response.json()
          if (printers && printers.length > 0) {
            setAvailablePrinters(printers)
            return
          }
        }
      } catch (serviceError) {
        // Service not running is expected - silently continue to next fallback
        // Network errors (CORS, connection refused) are expected when service is not running
        // Don't log these as they're not actual errors
      }
      
      // 3. Try Electron API if available (desktop app)
      if (window.electron && typeof window.electron.getPrinters === 'function') {
        const printers = await window.electron.getPrinters()
        if (printers && printers.length > 0) {
          setAvailablePrinters(printers)
          return
        }
      }
      
      // 4. Try Web Printing API (only available in Chrome/Edge with experimental flag)
      if (navigator.printers && typeof navigator.printers.getPrinters === 'function') {
        const printers = await navigator.printers.getPrinters()
        if (printers && printers.length > 0) {
          setAvailablePrinters(printers.map(p => ({
            name: p.name,
            status: p.status || 'available'
          })))
          return
        }
      }
      
      // 5. Fallback: Show helpful instructions
      setPrinterError('La detección automática no está disponible en este navegador. Opciones: 1) Usa la app de escritorio (Tauri) para detección automática, 2) Ejecuta el servicio local Node.js, 3) Abre Configuración del Sistema > Impresoras y copia el nombre manualmente.')
      
    } catch (error) {
      console.error('Error detecting printers:', error)
      setPrinterError('No se pudieron detectar impresoras. Ingresa el nombre manualmente desde la configuración del sistema.')
    } finally {
      setDetectingPrinters(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const handleSavePrinter = () => {
    setPrinterSettings({
      printerName: localPrinterName,
      printerWidth: localPrinterWidth,
      autoPrint: localAutoPrint
    })
    setPrinterSaved(true)
    setTimeout(() => setPrinterSaved(false), 2000)
  }

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' }
  ]

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
  ]

  const printerWidths = ['58mm', '80mm', '110mm']

  return (
    <div className="settings">
      <header className="settings__header">
        <div className="header__content">
          <div>
            <h1 className="settings__title">{t('settings.title')}</h1>
            <p className="settings__subtitle">{t('settings.subtitle')}</p>
          </div>
        </div>
      </header>

      <div className="settings__content">
        {/* User Section */}
        <div className="settings__section">
          <h2 className="settings__section-title">{t('settings.userAccount')}</h2>
          <div className="settings__field">
            <label className="settings__label">{t('settings.email')}</label>
            <div className="settings__value">{user?.email || 'Not logged in'}</div>
          </div>
          <button className="settings__button settings__button--danger" onClick={handleSignOut}>
            {t('settings.signOut')}
          </button>
        </div>

        {/* Appearance Section */}
        <div className="settings__section">
          <h2 className="settings__section-title">
            <FaMoon className="settings__icon" />
            {t('settings.appearance')}
          </h2>
          <div className="settings__field">
            <label className="settings__label">{t('settings.theme')}</label>
            <div className="settings__options">
              <button
                className={`settings__option ${theme === 'dark' ? 'settings__option--active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <FaMoon />
                {t('settings.darkMode')}
              </button>
              <button
                className={`settings__option ${theme === 'light' ? 'settings__option--active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <FaSun />
                {t('settings.lightMode')}
              </button>
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div className="settings__section">
          <h2 className="settings__section-title">
            <FaGlobe className="settings__icon" />
            {t('settings.language')}
          </h2>
          <div className="settings__field">
            <label className="settings__label">{t('settings.displayLanguage')}</label>
            <div className="settings__grid">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={`settings__card ${language === lang.code ? 'settings__card--active' : ''}`}
                  onClick={() => setLanguage(lang.code)}
                >
                  <span className="settings__card-name">{lang.name}</span>
                  {language === lang.code && <FaCheck className="settings__card-check" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Currency Section */}
        <div className="settings__section">
          <h2 className="settings__section-title">
            <FaDollarSign className="settings__icon" />
            {t('settings.currency')}
          </h2>
          <div className="settings__field">
            <label className="settings__label">{t('settings.defaultCurrency')}</label>
            <div className="settings__grid">
              {currencies.map((curr) => (
                <button
                  key={curr.code}
                  className={`settings__card ${currency === curr.code ? 'settings__card--active' : ''}`}
                  onClick={() => setCurrency(curr.code)}
                >
                  <div className="settings__card-content">
                    <span className="settings__card-symbol">{curr.symbol}</span>
                    <div>
                      <div className="settings__card-code">{curr.code}</div>
                      <div className="settings__card-name">{curr.name}</div>
                    </div>
                  </div>
                  {currency === curr.code && <FaCheck className="settings__card-check" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tax Rate Section */}
        <div className="settings__section">
          <h2 className="settings__section-title">
            <FaDollarSign className="settings__icon" />
            {t('settings.tax')}
          </h2>
          <div className="settings__field">
            <label className="settings__label">{t('settings.taxRate')}</label>
            <div className="settings__input-group">
              <input
                type="number"
                className="settings__input"
                value={localTaxRate}
                onChange={(e) => setLocalTaxRate(e.target.value)}
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
              />
              <span className="settings__input-suffix">%</span>
              <button
                className="settings__button settings__button--primary"
                onClick={(e) => {
                  const taxValue = parseFloat(localTaxRate) || 0
                  setTaxRate(taxValue)
                  // Show feedback
                  const btn = e.target
                  const originalText = btn.textContent
                  btn.textContent = '✓ ' + t('common.save')
                  setTimeout(() => {
                    btn.textContent = originalText
                  }, 1500)
                }}
              >
                {t('common.save')}
              </button>
            </div>
            <p className="settings__hint">
              {t('settings.taxRateHint') || 'Porcentaje de impuesto aplicado a las ventas (ej: 16 para 16%)'}
            </p>
          </div>
        </div>

        {/* Printer Section */}
        <div className="settings__section">
          <h2 className="settings__section-title">
            <FaPrint className="settings__icon" />
            {t('settings.printer')}
          </h2>
          
          <div className="settings__field">
            <label className="settings__label">{t('settings.printerName')}</label>
            
            {/* Printer Detection */}
            <div className="settings__printer-detection">
              <button
                type="button"
                className="settings__detect-btn"
                onClick={detectPrinters}
                disabled={detectingPrinters}
              >
                {detectingPrinters ? 'Detectando...' : '🔍 Detectar Impresoras'}
              </button>
              {printerError && (
                <p className="settings__printer-error">{printerError}</p>
              )}
            </div>

            {/* Available Printers Dropdown */}
            {availablePrinters.length > 0 && (
              <div className="settings__printer-list">
                <label className="settings__label">Impresoras Detectadas:</label>
                <select
                  className="settings__printer-select"
                  value={localPrinterName}
                  onChange={(e) => setLocalPrinterName(e.target.value)}
                >
                  <option value="">Selecciona una impresora...</option>
                  {availablePrinters.map((printer, idx) => (
                    <option key={idx} value={printer.name}>
                      {printer.name} {printer.status ? `(${printer.status})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manual Input */}
            <input
              type="text"
              className="settings__input"
              value={localPrinterName}
              onChange={(e) => setLocalPrinterName(e.target.value)}
              placeholder={t('settings.printerNamePlaceholder')}
            />
            <p className="settings__hint">{t('settings.printerHint')}</p>
          </div>

          <div className="settings__field">
            <label className="settings__label">{t('settings.paperWidth')}</label>
            <div className="settings__options">
              {printerWidths.map((width) => (
                <button
                  key={width}
                  className={`settings__option ${localPrinterWidth === width ? 'settings__option--active' : ''}`}
                  onClick={() => setLocalPrinterWidth(width)}
                >
                  {width}
                </button>
              ))}
            </div>
          </div>

          <div className="settings__field">
            <label className="settings__checkbox-wrapper">
              <input
                type="checkbox"
                checked={localAutoPrint}
                onChange={(e) => setLocalAutoPrint(e.target.checked)}
                className="settings__checkbox"
              />
              <span className="settings__checkbox-label">{t('settings.autoPrint')}</span>
            </label>
          </div>

          <button 
            className={`settings__button ${printerSaved ? 'settings__button--success' : ''}`}
            onClick={handleSavePrinter}
          >
            {printerSaved ? (
              <>
                <FaCheck /> {t('settings.saved')}
              </>
            ) : (
              t('settings.savePrinter')
            )}
          </button>
        </div>

        {/* System Info */}
        <div className="settings__section settings__section--info">
          <h2 className="settings__section-title">{t('settings.systemInfo')}</h2>
          <div className="settings__info-grid">
            <div className="settings__info-item">
              <span className="settings__info-label">{t('settings.version')}</span>
              <span className="settings__info-value">1.0.0</span>
            </div>
            <div className="settings__info-item">
              <span className="settings__info-label">{t('settings.environment')}</span>
              <span className="settings__info-value">Development</span>
            </div>
            <div className="settings__info-item">
              <span className="settings__info-label">{t('settings.theme')}</span>
              <span className="settings__info-value">{theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}</span>
            </div>
            <div className="settings__info-item">
              <span className="settings__info-label">{t('settings.language')}</span>
              <span className="settings__info-value">{languages.find(l => l.code === language)?.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings