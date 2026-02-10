import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaPlay, FaCheck, FaTimes, FaClock } from 'react-icons/fa'
import { usePendingStore } from '../../store/pendingStore'
import { useSaleStore } from '../../store/saleStore'
import { useSettingsStore } from '../../store/settingsStore'
import './Pending.css'

/**
 * Pending Sales component
 * Displays and manages unfinished/unpaid sales
 */
const Pending = () => {
  const navigate = useNavigate()
  const t = useSettingsStore(state => state.t)
  const language = useSettingsStore(state => state.language)
  
  const {
    pendingSales,
    loading,
    error,
    fetchPendingSales,
    markAsPaid,
    cancelSale,
    clearError
  } = usePendingStore()

  const { items: currentSaleItems, clearSale, addItem } = useSaleStore()

  const [selectedSale, setSelectedSale] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchPendingSales()
  }, [])

  const formatDateTime = (dateString) => {
    const localeMap = {
      'en': 'en-US',
      'es': 'es-MX',
      'fr': 'fr-FR',
      'de': 'de-DE'
    }
    
    const locale = localeMap[language] || 'es-MX'
    const date = new Date(dateString)
    
    return date.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleResumeSale = (sale) => {
    if (currentSaleItems.length > 0) {
      if (!window.confirm(t('pendingSales.confirmResume'))) {
        return
      }
    }

    // Clear current sale
    clearSale()

    // Load sale items into current sale
    const saleItems = sale.sale_items || []
    saleItems.forEach(item => {
      if (item.product) {
        addItem(item.product, item.quantity)
      }
    })

    // Navigate to current sale
    navigate('/')
  }

  const handleMarkAsPaid = (sale) => {
    setSelectedSale(sale)
    setSelectedPaymentMethod('cash')
    setShowPaymentModal(true)
  }

  const handleConfirmPayment = async () => {
    if (!selectedSale) return

    setProcessing(true)
    const success = await markAsPaid(selectedSale.id, selectedPaymentMethod)
    setProcessing(false)

    if (success) {
      setShowPaymentModal(false)
      setSelectedSale(null)
    }
  }

  const handleCancelSale = (sale) => {
    setSelectedSale(sale)
    setShowCancelModal(true)
  }

  const handleConfirmCancel = async () => {
    if (!selectedSale) return

    setProcessing(true)
    const success = await cancelSale(selectedSale)
    setProcessing(false)

    if (success) {
      setShowCancelModal(false)
      setSelectedSale(null)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: t('pendingSales.statusPending'), icon: FaClock, color: 'warning' },
      completed: { label: t('pendingSales.statusPaid'), icon: FaCheck, color: 'success' },
      cancelled: { label: t('pendingSales.statusCancelled'), icon: FaTimes, color: 'danger' }
    }
    
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    
    return (
      <span className={`pending__badge pending__badge--${badge.color}`}>
        <Icon /> {badge.label}
      </span>
    )
  }

  return (
    <div className="pending">
      {/* Header */}
      <header className="pending__header">
        <div className="pending__header-content">
          <div>
            <h1 className="pending__title">{t('pendingSales.title')}</h1>
            <p className="pending__subtitle">{t('pendingSales.subtitle')}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="pending__content">
        {loading ? (
          <div className="pending__loading">{t('pendingSales.loading')}</div>
        ) : error ? (
          <div className="pending__error">
            <p>{error}</p>
            <button onClick={() => { clearError(); fetchPendingSales(); }} className="pending__retry-btn">
              {t('pendingSales.retry')}
            </button>
          </div>
        ) : pendingSales.length === 0 ? (
          <div className="pending__empty">
            <FaClock className="pending__empty-icon" />
            <p className="pending__empty-title">{t('pendingSales.emptyTitle')}</p>
            <p className="pending__empty-subtitle">{t('pendingSales.emptySubtitle')}</p>
          </div>
        ) : (
          <div className="pending__table-card">
            <table className="pending__table">
              <thead>
                <tr>
                  <th>{t('pendingSales.folio')}</th>
                  <th>{t('pendingSales.dateTime')}</th>
                  <th>{t('pendingSales.items')}</th>
                  <th>{t('pendingSales.total')}</th>
                  <th>{t('pendingSales.payment')}</th>
                  <th>{t('pendingSales.status')}</th>
                  <th>{t('pendingSales.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="pending__folio">{sale.sale_number}</td>
                    <td className="pending__datetime">{formatDateTime(sale.created_at)}</td>
                    <td className="pending__items">{sale.sale_items?.length || 0} {t('pendingSales.itemsCount')}</td>
                    <td className="pending__total">${sale.total.toFixed(2)}</td>
                    <td className="pending__payment">{sale.payment_method || t('pendingSales.notSet')}</td>
                    <td className="pending__status">{getStatusBadge(sale.status)}</td>
                    <td className="pending__actions">
                      <button
                        className="pending__action-btn pending__action-btn--resume"
                        onClick={() => handleResumeSale(sale)}
                        title={t('pendingSales.resumeTitle')}
                      >
                        <FaPlay />
                      </button>
                      <button
                        className="pending__action-btn pending__action-btn--paid"
                        onClick={() => handleMarkAsPaid(sale)}
                        title={t('pendingSales.markAsPaidTitle')}
                      >
                        <FaCheck />
                      </button>
                      <button
                        className="pending__action-btn pending__action-btn--cancel"
                        onClick={() => handleCancelSale(sale)}
                        title={t('pendingSales.cancelTitle')}
                      >
                        <FaTimes />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => !processing && setShowPaymentModal(false)}>
          <div className="modal pending__modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{t('pendingSales.markAsPaidModal')}</h2>
              <button className="modal__close" onClick={() => !processing && setShowPaymentModal(false)}>×</button>
            </div>

            <div className="modal__content">
              <div className="pending__modal-info">
                <p><strong>{t('pendingSales.folio')}:</strong> {selectedSale?.sale_number}</p>
                <p><strong>{t('pendingSales.total')}:</strong> <span className="pending__modal-total">${selectedSale?.total.toFixed(2)}</span></p>
              </div>

              <div className="pending__modal-section">
                <label className="pending__modal-label">{t('pendingSales.selectPaymentMethod')}</label>
                <div className="pending__modal-options">
                  {['cash', 'card', 'transfer'].map(method => (
                    <button
                      key={method}
                      className={`pending__modal-option ${selectedPaymentMethod === method ? 'pending__modal-option--active' : ''}`}
                      onClick={() => setSelectedPaymentMethod(method)}
                    >
                      {t(`payment.${method}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal__footer">
              <button
                className="modal__btn modal__btn--secondary"
                onClick={() => setShowPaymentModal(false)}
                disabled={processing}
              >
                {t('payment.cancel')}
              </button>
              <button
                className="modal__btn modal__btn--primary"
                onClick={handleConfirmPayment}
                disabled={processing}
              >
                {processing ? t('payment.processing') : t('pendingSales.confirmPayment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => !processing && setShowCancelModal(false)}>
          <div className="modal pending__modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{t('pendingSales.cancelSaleModal')}</h2>
              <button className="modal__close" onClick={() => !processing && setShowCancelModal(false)}>×</button>
            </div>

            <div className="modal__content">
              <div className="pending__modal-warning">
                <p><strong>{t('pendingSales.confirmCancelQuestion')}</strong></p>
                <p>{t('pendingSales.folio')}: {selectedSale?.sale_number}</p>
                <p>{t('pendingSales.total')}: ${selectedSale?.total.toFixed(2)}</p>
                <p className="pending__modal-warning-text">
                  ⚠️ {t('pendingSales.cancelWarning')}
                </p>
              </div>
            </div>

            <div className="modal__footer">
              <button
                className="modal__btn modal__btn--secondary"
                onClick={() => setShowCancelModal(false)}
                disabled={processing}
              >
                {t('pendingSales.goBack')}
              </button>
              <button
                className="modal__btn modal__btn--danger"
                onClick={handleConfirmCancel}
                disabled={processing}
              >
                {processing ? t('pendingSales.cancelling') : t('pendingSales.yesCancelSale')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Pending
