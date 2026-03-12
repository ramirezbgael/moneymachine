import React, { useState, useEffect, useCallback } from 'react'
import ProductSearch from '../ProductSearch/ProductSearch'
import ItemsList from '../ItemsList/ItemsList'
import FloatingBar from '../FloatingBar/FloatingBar'
import PaymentModalMVP from '../PaymentModal/PaymentModalMVP'
import PrintModal from '../PrintModal/PrintModal'
import QuickAddProductModal from '../QuickAddProductModal/QuickAddProductModal'
import FeaturedProducts from '../FeaturedProducts/FeaturedProducts'
import { useSettingsStore } from '../../store/settingsStore'
import { useSaleStore } from '../../store/saleStore'
import { useAuthStore } from '../../store/authStore'
import { processSale } from '../../services/saleService'
import './CurrentSale.css'

/**
 * Main Current Sale screen component
 * Single screen layout optimized for keyboard and barcode scanner
 */
const CurrentSale = () => {
  const t = useSettingsStore(state => state.t)
  const language = useSettingsStore(state => state.language)
  const showFeaturedProducts = useSettingsStore(state => state.showFeaturedProducts)
  const { items, getTotals, clearSale } = useSaleStore()
  const { user } = useAuthStore()
  
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [processedSale, setProcessedSale] = useState(null)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [savingPending, setSavingPending] = useState(false)

  // Update date/time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const handlePaymentComplete = (saleData) => {
    setProcessedSale(saleData)
    setShowPaymentModal(false)
    setShowPrintModal(true)
  }

  const handlePrintComplete = (shouldPrint) => {
    if (shouldPrint && processedSale) {
      // Handle print logic here
      console.log('Printing ticket:', processedSale)
    }
    setShowPrintModal(false)
    setProcessedSale(null)
    
    // Refocus search input for immediate next sale
    setTimeout(() => {
      const searchInput = document.querySelector('.product-search__input')
      if (searchInput) {
        searchInput.focus()
      }
    }, 100)
  }

  const handleQuickAddProduct = (productData) => {
    setShowQuickAddModal(false)
  }

  const handleSaveAsPending = useCallback(async () => {
    if (items.length === 0) {
      alert(t('currentSale.empty'))
      return
    }
    setSavingPending(true)
    try {
      const totals = getTotals()
      await processSale({
        items,
        subtotal: totals.subtotal,
        discount: totals.discountAmount,
        total: totals.total,
        paymentMethod: null,
        userId: user?.id || null,
        status: 'pending'
      })
      clearSale()
      alert(t('currentSale.pendingSaved'))
      setTimeout(() => {
        const searchInput = document.querySelector('.product-search__input')
        if (searchInput) searchInput.focus()
      }, 100)
    } catch (error) {
      console.error('Error saving pending sale:', error)
      alert('Error: ' + (error.message || t('currentSale.pendingSaved')))
    } finally {
      setSavingPending(false)
    }
  }, [items, getTotals, clearSale, user?.id, t])

  // F3: Guardar como pendiente (ventas pendientes)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F3' && items.length > 0 && !savingPending) {
        const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)
        if (!inInput) {
          e.preventDefault()
          handleSaveAsPending()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [items.length, savingPending, handleSaveAsPending])

  const formatDateTime = (date) => {
    // Map language codes to locale strings
    const localeMap = {
      'en': 'en-US',
      'es': 'es-MX',
      'fr': 'fr-FR',
      'de': 'de-DE'
    }
    
    const locale = localeMap[language] || 'es-MX'
    
    return date.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="current-sale">
      {/* Header */}
      <header className="current-sale__header">
        <div className="current-sale__header-content">
          <div>
            <h1 className="current-sale__title">{t('currentSale.title')}</h1>
            <div className="current-sale__datetime">{formatDateTime(currentDateTime)}</div>
          </div>
          {items.length > 0 && (
            <div className="current-sale__header-actions">
              <button
                className="current-sale__pending-sale-btn"
                onClick={handleSaveAsPending}
                disabled={savingPending}
                title={t('currentSale.savePending') + ' [F3]'}
              >
                {savingPending ? t('currentSale.savingPending') : t('currentSale.savePending')}
                <span className="current-sale__hotkey">[F3]</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Search Bar - Always Visible */}
      <div className="current-sale__search">
        <ProductSearch />
      </div>

      {/* Featured Products strip */}
      {showFeaturedProducts && <FeaturedProducts />}

      {/* Items List */}
      <div className="current-sale__items">
        <ItemsList />
      </div>

      {/* Floating Bar - Fixed Bottom */}
      <FloatingBar
        onCheckout={() => setShowPaymentModal(true)}
        onSavePending={handleSaveAsPending}
        savingPending={savingPending}
      />

      {/* Payment modal */}
      {showPaymentModal && (
        <PaymentModalMVP
          onComplete={handlePaymentComplete}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      {/* Print confirmation modal */}
      {showPrintModal && (
        <PrintModal
          sale={processedSale}
          onConfirm={handlePrintComplete}
          onCancel={() => handlePrintComplete(false)}
        />
      )}

      {/* Quick add product modal */}
      {showQuickAddModal && (
        <QuickAddProductModal
          initialBarcode={pendingBarcode}
          onSave={handleQuickAddProduct}
          onCancel={() => {
            setShowQuickAddModal(false)
            setPendingBarcode('')
          }}
        />
      )}
    </div>
  )
}

export default CurrentSale