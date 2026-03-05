import React, { useState, useEffect, useRef } from 'react'
import { useSaleStore } from '../../store/saleStore'
import { processSale } from '../../services/saleService'
import '../Modal/Modal.css'
import './PaymentModal.css'

/**
 * Payment modal component
 * - Payment method selection (Cash, Card, Transfer)
 * - Receipt type (Ticket, Invoice)
 * - Invoice customer form if needed
 * - Enter to confirm payment
 */
const PaymentModal = ({ onComplete, onCancel }) => {
  const items = useSaleStore(state => state.items)
  const getTotals = useSaleStore(state => state.getTotals)
  const clearSale = useSaleStore(state => state.clearSale)

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [receiptType, setReceiptType] = useState('ticket')
  const [customer, setCustomer] = useState({
    phone: '',
    name: '',
    lastName: '',
    rfc: '',
    email: '',
    pendingCSF: false
  })
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [customerFound, setCustomerFound] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [focusedSection, setFocusedSection] = useState('payment') // 'payment' | 'receipt'
  const modalRef = useRef(null)
  const phoneInputRef = useRef(null)

  const { total, itemCount } = getTotals()
  
  const paymentMethods = ['cash', 'card', 'transfer']
  const receiptTypes = ['ticket', 'invoice']

  // Mock customer search (in production, this would query a database)
  const searchCustomerByPhone = async (phone) => {
    if (!phone || phone.trim() === '') {
      setCustomerFound(false)
      return
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300))

    // Mock: assume phone "5551234567" exists
    if (phone === '5551234567') {
      setCustomer({
        phone,
        name: 'John',
        lastName: 'Doe',
        rfc: 'DOEJ800101ABC',
        email: 'john.doe@example.com',
        pendingCSF: false
      })
      setCustomerFound(true)
    } else {
      setCustomerFound(false)
    }
  }

  // Handle phone search when receipt type is invoice
  useEffect(() => {
    if (receiptType === 'invoice' && customer.phone) {
      setSearchingCustomer(true)
      searchCustomerByPhone(customer.phone).finally(() => {
        setSearchingCustomer(false)
      })
    }
  }, [customer.phone, receiptType])

  // Auto-focus phone input for invoice
  useEffect(() => {
    if (receiptType === 'invoice' && phoneInputRef.current) {
      phoneInputRef.current.focus()
    }
  }, [receiptType])

  // Auto-focus payment method on mount
  useEffect(() => {
    // Focus first payment option after a short delay
    const timer = setTimeout(() => {
      const firstOption = document.querySelector('.payment-modal__option')
      if (firstOption) {
        firstOption.focus()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Handle keyboard navigation with arrows
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInInput = e.target.tagName === 'INPUT' && e.target.type !== 'submit'
      
      // Allow arrow up to exit input and go back to navigation
      if (isInInput && e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedSection('receipt')
        e.target.blur()
        return
      }
      
      // Allow arrow left/right in inputs when in invoice form
      if (isInInput && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        setFocusedSection('receipt')
        const currentIndex = receiptTypes.indexOf(receiptType)
        if (e.key === 'ArrowRight') {
          const nextIndex = (currentIndex + 1) % receiptTypes.length
          setReceiptType(receiptTypes[nextIndex])
        } else {
          const prevIndex = (currentIndex - 1 + receiptTypes.length) % receiptTypes.length
          setReceiptType(receiptTypes[prevIndex])
        }
        e.target.blur()
        return
      }

      // Handle Enter in inputs
      if (isInInput && e.key === 'Enter' && !isProcessing) {
        if (receiptType === 'invoice') {
          if (!customer.phone) return
          if (!customerFound && (!customer.name || !customer.lastName || !customer.rfc)) {
            return
          }
        }
        handleProcessPayment()
        return
      }

      // Handle Escape in inputs
      if (isInInput && e.key === 'Escape') {
        e.target.blur()
        setFocusedSection('receipt')
        return
      }

      // Don't handle other keys if typing in input
      if (isInInput) {
        return
      }

      // Arrow navigation (when not in input)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        if (focusedSection === 'payment') {
          const currentIndex = paymentMethods.indexOf(paymentMethod)
          if (e.key === 'ArrowRight') {
            const nextIndex = (currentIndex + 1) % paymentMethods.length
            setPaymentMethod(paymentMethods[nextIndex])
          } else {
            const prevIndex = (currentIndex - 1 + paymentMethods.length) % paymentMethods.length
            setPaymentMethod(paymentMethods[prevIndex])
          }
        } else if (focusedSection === 'receipt') {
          const currentIndex = receiptTypes.indexOf(receiptType)
          if (e.key === 'ArrowRight') {
            const nextIndex = (currentIndex + 1) % receiptTypes.length
            setReceiptType(receiptTypes[nextIndex])
          } else {
            const prevIndex = (currentIndex - 1 + receiptTypes.length) % receiptTypes.length
            setReceiptType(receiptTypes[prevIndex])
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (focusedSection === 'payment') {
          setFocusedSection('receipt')
        } else if (focusedSection === 'receipt' && receiptType === 'invoice') {
          // Focus phone input if invoice is selected
          if (phoneInputRef.current) {
            phoneInputRef.current.focus()
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedSection('payment')
      } else if (e.key === 'Enter' && !isProcessing) {
        handleProcessPayment()
      } else if (e.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [paymentMethod, receiptType, customer, customerFound, isProcessing, focusedSection, onCancel])

  // Handle customer input change
  const handleCustomerChange = (field, value) => {
    setCustomer(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Process payment
  const handleProcessPayment = async () => {
    if (isProcessing) return

    // Validate invoice form if needed
    if (receiptType === 'invoice') {
      if (!customer.phone) {
        alert('Phone number is required for invoice')
        return
      }
      if (!customerFound && (!customer.name || !customer.lastName || !customer.rfc)) {
        alert('Name, Last Name, and RFC are required for new customers')
        return
      }
    }

    setIsProcessing(true)

    try {
      const saleData = {
        items,
        subtotal: total,
        tax: 0, // Calculate tax if needed
        total,
        paymentMethod,
        receiptType,
        customer: receiptType === 'invoice' ? customer : null
      }

      const processedSale = await processSale(saleData)

      // Clear current sale
      clearSale()

      // Call onComplete callback
      onComplete(processedSale)
    } catch (error) {
      console.error('Error processing payment:', error)
      alert('Error processing payment. Please try again.')
      setIsProcessing(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        ref={modalRef}
        className="modal payment-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">Payment</h2>
          <button className="modal__close" onClick={onCancel}>×</button>
        </div>

        <div className="modal__content">
          {/* Total Display */}
          <div className="payment-modal__total">
            <div className="payment-modal__total-label">Total to Pay</div>
            <div className="payment-modal__total-amount">${total.toFixed(2)}</div>
            <div className="payment-modal__items-count">{itemCount} item(s)</div>
          </div>

          {/* Payment Method */}
          <div className={`payment-modal__section ${focusedSection === 'payment' ? 'payment-modal__section--focused' : ''}`}>
            <label className="payment-modal__label">
              Payment Method
              {focusedSection === 'payment' && <span className="payment-modal__hint">← → to navigate</span>}
            </label>
            <div className="payment-modal__options">
              <button
                className={`payment-modal__option ${paymentMethod === 'cash' ? 'payment-modal__option--active' : ''}`}
                onClick={() => setPaymentMethod('cash')}
              >
                Cash
              </button>
              <button
                className={`payment-modal__option ${paymentMethod === 'card' ? 'payment-modal__option--active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                Card
              </button>
              <button
                className={`payment-modal__option ${paymentMethod === 'transfer' ? 'payment-modal__option--active' : ''}`}
                onClick={() => setPaymentMethod('transfer')}
              >
                Transfer
              </button>
            </div>
          </div>

          {/* Receipt Type */}
          <div className={`payment-modal__section ${focusedSection === 'receipt' ? 'payment-modal__section--focused' : ''}`}>
            <label className="payment-modal__label">
              Receipt Type
              {focusedSection === 'receipt' && <span className="payment-modal__hint">← → to navigate</span>}
            </label>
            <div className="payment-modal__options">
              <button
                className={`payment-modal__option ${receiptType === 'ticket' ? 'payment-modal__option--active' : ''}`}
                onClick={() => setReceiptType('ticket')}
              >
                Ticket
              </button>
              <button
                className={`payment-modal__option ${receiptType === 'invoice' ? 'payment-modal__option--active' : ''}`}
                onClick={() => setReceiptType('invoice')}
              >
                Invoice
              </button>
            </div>
          </div>

          {/* Invoice Customer Form */}
          {receiptType === 'invoice' && (
            <div className="payment-modal__section payment-modal__customer-form">
              <label className="payment-modal__label">
                Customer Information
                <span className="payment-modal__hint">↑ ← → to navigate back</span>
              </label>

              {/* Phone Input */}
              <div className="payment-modal__field">
                <label className="payment-modal__field-label">Phone *</label>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  className="payment-modal__input"
                  value={customer.phone}
                  onChange={(e) => handleCustomerChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
                {searchingCustomer && (
                  <div className="payment-modal__searching">Searching...</div>
                )}
                {!searchingCustomer && customer.phone && customerFound && (
                  <div className="payment-modal__found">Customer found</div>
                )}
              </div>

              {/* New Customer Fields (if not found) */}
              {!customerFound && customer.phone && (
                <>
                  <div className="payment-modal__field">
                    <label className="payment-modal__field-label">Name *</label>
                    <input
                      type="text"
                      className="payment-modal__input"
                      value={customer.name}
                      onChange={(e) => handleCustomerChange('name', e.target.value)}
                      placeholder="Customer name"
                    />
                  </div>

                  <div className="payment-modal__field">
                    <label className="payment-modal__field-label">Last Name *</label>
                    <input
                      type="text"
                      className="payment-modal__input"
                      value={customer.lastName}
                      onChange={(e) => handleCustomerChange('lastName', e.target.value)}
                      placeholder="Customer last name"
                    />
                  </div>

                  <div className="payment-modal__field">
                    <label className="payment-modal__field-label">RFC *</label>
                    <input
                      type="text"
                      className="payment-modal__input"
                      value={customer.rfc}
                      onChange={(e) => handleCustomerChange('rfc', e.target.value)}
                      placeholder="Tax ID (RFC)"
                    />
                  </div>

                  <div className="payment-modal__field">
                    <label className="payment-modal__field-label">Email</label>
                    <input
                      type="email"
                      className="payment-modal__input"
                      value={customer.email}
                      onChange={(e) => handleCustomerChange('email', e.target.value)}
                      placeholder="customer@example.com"
                    />
                  </div>

                  <div className="payment-modal__field">
                    <label className="payment-modal__checkbox-label">
                      <input
                        type="checkbox"
                        checked={customer.pendingCSF}
                        onChange={(e) => handleCustomerChange('pendingCSF', e.target.checked)}
                      />
                      Pending CSF Invoice
                    </label>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button
            className="modal__btn modal__btn--secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel (Esc)
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={handleProcessPayment}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Confirm Payment (Enter)'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaymentModal