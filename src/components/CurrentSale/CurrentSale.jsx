import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductSearch from '../ProductSearch/ProductSearch'
import FeaturedProducts from '../FeaturedProducts/FeaturedProducts'
import { ProductGrid } from './pos/ProductGrid'
import { CartPanel } from './pos/CartPanel'
import PendingSavedModal from './pos/PendingSavedModal'
import { PosMobileHeader, PosMobileTabs } from './pos/MobilePosChrome'
import { useLayoutNav } from '../../context/LayoutNavContext'
import { useSettingsStore } from '../../store/settingsStore'
import { useSaleStore } from '../../store/saleStore'
import { useAuthStore } from '../../store/authStore'
import { processSale } from '../../services/saleService'
import { productService } from '../../services/productService'
import { playScanBeep } from '../../services/soundService'
import { FaCashRegister } from 'react-icons/fa6'
import './CurrentSale.css'

const MOBILE_MQ = '(max-width: 1023px)'

const CurrentSale = () => {
  const navigate = useNavigate()
  const { openMobileSidebar } = useLayoutNav()
  const t = useSettingsStore((state) => state.t)
  const language = useSettingsStore((state) => state.language)
  const showFeaturedProducts = useSettingsStore((state) => state.showFeaturedProducts)
  const showPosProductCatalog = useSettingsStore((state) => state.showPosProductCatalog)
  const { items, getTotals, clearSale, addItem } = useSaleStore()
  const { user } = useAuthStore()

  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [savingPending, setSavingPending] = useState(false)
  const [pendingSavedSale, setPendingSavedSale] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [catalogQuery, setCatalogQuery] = useState('')
  const [justAddedId, setJustAddedId] = useState(null)
  const [cartPulse, setCartPulse] = useState(false)
  const [mobileTab, setMobileTab] = useState('products')
  const [isNarrowViewport, setIsNarrowViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches
  )
  const bumpTimers = useRef({})

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const onChange = () => setIsNarrowViewport(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const all = await productService.getAll()
        if (!cancelled) setCatalog(all || [])
      } catch (e) {
        console.error(e)
        if (!cancelled) setCatalog([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setCurrentDateTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const pulseFeedback = useCallback((productId) => {
    if (productId != null) {
      setJustAddedId(productId)
      const prev = bumpTimers.current[productId]
      if (prev) clearTimeout(prev)
      bumpTimers.current[productId] = setTimeout(() => {
        setJustAddedId((cur) => (cur === productId ? null : cur))
        delete bumpTimers.current[productId]
      }, 450)
    }
    setCartPulse(true)
    setTimeout(() => setCartPulse(false), 380)
  }, [])

  const handleAddProduct = useCallback(
    (product) => {
      addItem(product, 1)
      playScanBeep()
      pulseFeedback(product?.id)
    },
    [addItem, pulseFeedback]
  )

  const handleSaveAsPending = useCallback(async () => {
    if (items.length === 0) {
      alert(t('currentSale.empty'))
      return
    }
    setSavingPending(true)
    try {
      const totals = getTotals()
      const saved = await processSale({
        items,
        subtotal: totals.subtotal,
        discount: totals.discountAmount,
        total: totals.total,
        paymentMethod: null,
        userId: user?.id || null,
        status: 'pending'
      })
      clearSale()
      setPendingSavedSale(saved)
    } catch (error) {
      console.error('Error saving pending sale:', error)
      alert('Error: ' + (error.message || t('currentSale.pendingSaved')))
    } finally {
      setSavingPending(false)
    }
  }, [items, getTotals, clearSale, user?.id, t])

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
    const localeMap = { en: 'en-US', es: 'es-MX', fr: 'fr-FR', de: 'de-DE' }
    const locale = localeMap[language] || 'es-MX'
    return date.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const onQueryChange = useCallback((q) => setCatalogQuery(q), [])

  const itemCount = items.length
  const isMobilePos = isNarrowViewport
  const showProductsPanel = !isMobilePos || mobileTab === 'products'
  const showCartPanel = !isMobilePos || mobileTab === 'cart'
  const cartIsMobileLayout = isMobilePos && mobileTab === 'cart'

  return (
    <div className="pos-sale flex h-full min-h-0 w-full flex-col gap-0 overflow-hidden lg:flex-row">
      {isMobilePos ? (
        <>
          <PosMobileHeader
            title={t('currentSale.title')}
            subtitle={formatDateTime(currentDateTime)}
            onOpenMenu={openMobileSidebar}
            openMenuLabel={t('currentSale.posOpenMenu')}
            onCaja={() => navigate('/cash-register')}
            cajaLabel={t('currentSale.cajaNav')}
          />
          <PosMobileTabs
            active={mobileTab}
            onChange={setMobileTab}
            productsLabel={t('currentSale.posTabProducts')}
            cartLabel={t('currentSale.posTabCart')}
            itemCount={itemCount}
            tabsAriaLabel={t('currentSale.posTabsAria')}
          />
        </>
      ) : null}

      <section
        id="pos-panel-products"
        role="tabpanel"
        aria-labelledby={isMobilePos ? 'pos-tab-products' : undefined}
        className={`pos-sale-main min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden lg:flex ${
          showProductsPanel ? 'flex' : 'max-lg:hidden'
        }`}
      >
        <header className="pos-sale-cart-header hidden shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 lg:flex">
          <div className="pos-sale-header-brand">
            <span className="pos-sale-header-accent" aria-hidden />
            <FaCashRegister className="pos-sale-header-icon" aria-hidden />
            <div className="pos-sale-header-titles">
              <h1>{t('currentSale.title')}</h1>
              <p className="pos-sale-header-time">{formatDateTime(currentDateTime)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/cash-register')} className="pos-sale-ghost-btn">
              {t('currentSale.cajaNav')}
            </button>
          </div>
        </header>

        <div
          className={`pos-sale-sticky-search shrink-0 px-3 md:px-6 lg:px-4 lg:pb-3 lg:pt-4 ${
            isMobilePos
              ? 'sticky top-0 z-20 border-b border-[var(--pos-border-subtle)] bg-[var(--pos-bg-deep)]/95 py-2 backdrop-blur-md'
              : 'pb-3 pt-2'
          }`}
        >
          <ProductSearch
            wrapperClassName="pos-sale-search w-full max-w-none"
            inputClassName="!min-h-[48px] !rounded-2xl !px-5 !py-3 !text-base lg:!min-h-[56px] lg:!py-4"
            onQueryChange={onQueryChange}
            suppressSuggestions={showPosProductCatalog}
          />
        </div>

        {showFeaturedProducts && (
          <div className="pos-quick-chips-wrap shrink-0 px-3 pb-1 pt-0 md:px-6 lg:px-4 lg:pb-2 lg:pt-1">
            <p className="pos-sale-section-label mb-1 lg:mb-2">{t('currentSale.posQuickSection')}</p>
            <FeaturedProducts
              onProductAdd={handleAddProduct}
              className="pos-quick-chips featured-products !gap-2 !overflow-x-auto !pb-1 !pt-0 lg:!pb-2 lg:!pt-1"
            />
          </div>
        )}

        {showPosProductCatalog ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-2 md:px-6 lg:px-4 lg:pb-4">
            <p className="pos-sale-section-label mb-2 lg:mb-3">{t('currentSale.posCatalogSection')}</p>
            <ProductGrid
              products={catalog}
              filter={catalogQuery}
              onAddProduct={handleAddProduct}
              justAddedId={justAddedId}
              denseCards={!isMobilePos}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 pb-6 pt-2 md:px-6 lg:px-4">
            <p className="text-center text-sm leading-relaxed text-[var(--pos-text-muted)]">
              Catálogo oculto. Escribe el nombre o código en el buscador para ver sugerencias y agregar.
            </p>
          </div>
        )}
      </section>

      <CartPanel
        id="pos-panel-cart"
        role="tabpanel"
        aria-labelledby={isMobilePos ? 'pos-tab-cart' : undefined}
        className={showCartPanel ? 'max-lg:flex' : 'max-lg:hidden'}
        isMobileLayout={cartIsMobileLayout}
        onCheckout={() => navigate('/checkout')}
        onSavePending={handleSaveAsPending}
        savingPending={savingPending}
        cartPulse={cartPulse}
        onProductAddedFeedback={pulseFeedback}
      />

      <PendingSavedModal
        sale={pendingSavedSale}
        onClose={() => setPendingSavedSale(null)}
        t={t}
      />
    </div>
  )
}

export default CurrentSale
