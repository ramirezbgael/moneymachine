import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useReportsStore } from '../../store/reportsStore'
import { useSettingsStore } from '../../store/settingsStore'
import './Reports.css'

/**
 * Reports view component
 * Sales reports and analytics with charts
 */
const Reports = () => {
  const t = useSettingsStore((s) => s.t)
  const navigate = useNavigate()
  const { tabId } = useParams()
  const { 
    dailyTotal, 
    dailySoldProducts,
    topProducts, 
    repeatCustomers, 
    outOfStockProducts,
    monthlySummary,
    profitMargin,
    leastSoldProducts,
    loading,
    fetchDailyReport,
    fetchDailySoldProducts,
    fetchTopProducts,
    fetchRepeatCustomers,
    fetchOutOfStock,
    fetchMonthlySummary,
    fetchProfitMargin,
    fetchLeastSold
  } = useReportsStore()

  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  const activeTab = tabId || 'dailyTotal'

  useEffect(() => {
    loadAllReports()
  }, [selectedPeriod, dateRange])

  const loadAllReports = async () => {
    await Promise.all([
      fetchDailyReport(selectedPeriod === 'custom' ? dateRange : null),
      fetchDailySoldProducts(selectedPeriod === 'custom' ? dateRange : null),
      fetchTopProducts(10),
      fetchRepeatCustomers(),
      fetchOutOfStock(),
      fetchMonthlySummary(),
      fetchProfitMargin(),
      fetchLeastSold(10)
    ])
  }

  const topProduct = topProducts[0]
  const topCustomer = repeatCustomers[0]
  const lastDaily = monthlySummary?.dailySales?.slice(-1)?.[0]
  const paymentMethodsCount = monthlySummary?.paymentMethods?.length || 0

  const getSparklinePath = (values, width = 120, height = 42, padding = 4) => {
    if (!values || values.length === 0) return ''
    if (values.length === 1) {
      const y = height / 2
      return `M ${padding} ${y} L ${width - padding} ${y}`
    }

    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const stepX = (width - padding * 2) / (values.length - 1)

    return values
      .map((value, index) => {
        const x = padding + index * stepX
        const normalized = (value - min) / range
        const y = height - padding - normalized * (height - padding * 2)
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      })
      .join(' ')
  }

  const dailySeries = (monthlySummary?.dailySales || []).map((d) => Number(d.total) || 0).slice(-10)
  const monthlySeries = dailySeries.reduce((acc, current) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0
    acc.push(prev + current)
    return acc
  }, [])
  const topProductsSeries = topProducts.map((p) => Number(p.quantity) || 0).slice(0, 10)
  const customersSeries = repeatCustomers.map((c) => Number(c.purchaseCount) || 0).slice(0, 10)
  const leastSoldSeries = leastSoldProducts.map((p) => Number(p.quantitySold) || 0).slice(0, 10)
  const paymentSeries = (monthlySummary?.paymentMethods || []).map((pm) => Number(pm.value) || 0).slice(0, 10)
  const outOfStockSeries = Array.from({ length: Math.max(1, Math.min(10, outOfStockProducts.length || 1)) }, (_, idx) => idx + 1)

  const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`

  const getMainSeries = () => {
    switch (activeTab) {
      case 'dailyTotal':
      case 'salesTrend':
        return dailySeries
      case 'monthlyTotal':
        return monthlySeries
      case 'topProducts':
        return topProductsSeries
      case 'repeatCustomers':
        return customersSeries
      case 'outOfStock':
        return outOfStockSeries
      case 'leastSold':
        return leastSoldSeries
      case 'paymentMethods':
        return paymentSeries
      default:
        return dailySeries
    }
  }

  const mainSeries = getMainSeries()

  const getSeriesStats = (series) => {
    if (!series || series.length === 0) {
      return { current: 0, average: 0, min: 0, max: 0 }
    }

    const sum = series.reduce((acc, value) => acc + Number(value || 0), 0)
    return {
      current: Number(series[series.length - 1] || 0),
      average: sum / series.length,
      min: Math.min(...series),
      max: Math.max(...series)
    }
  }

  const getPeriodComparison = (series) => {
    if (!series || series.length < 2) {
      return { previous: 0, current: 0, delta: 0, deltaPct: 0 }
    }

    const midpoint = Math.floor(series.length / 2)
    const previousSlice = series.slice(0, midpoint)
    const currentSlice = series.slice(midpoint)

    const previous = previousSlice.reduce((acc, value) => acc + Number(value || 0), 0)
    const current = currentSlice.reduce((acc, value) => acc + Number(value || 0), 0)
    const delta = current - previous
    const deltaPct = previous === 0 ? (current > 0 ? 100 : 0) : (delta / previous) * 100

    return { previous, current, delta, deltaPct }
  }

  const mainStats = getSeriesStats(mainSeries)
  const mainComparison = getPeriodComparison(mainSeries)

  const formatMetricValue = (value) => {
    if (activeTab === 'dailyTotal' || activeTab === 'monthlyTotal' || activeTab === 'salesTrend' || activeTab === 'paymentMethods') {
      return formatCurrency(value)
    }
    return Number(value || 0).toFixed(0)
  }

  const chartWidth = 760
  const chartHeight = 220

  const reportTiles = [
    {
      id: 'dailyTotal',
      title: t('reports.dailyTotal'),
      value: `$${Number(dailyTotal || 0).toFixed(2)}`,
      hint: 'Ver subpestaña diaria',
      series: dailySeries
    },
    {
      id: 'monthlyTotal',
      title: t('reports.monthlyTotal'),
      value: `$${Number(monthlySummary?.total || 0).toFixed(2)}`,
      hint: 'Ver subpestaña mensual',
      series: monthlySeries
    },
    {
      id: 'topProducts',
      title: t('reports.topProducts'),
      value: topProduct ? topProduct.name : 'Sin datos',
      hint: 'Ver subpestaña de ranking',
      series: topProductsSeries
    },
    {
      id: 'repeatCustomers',
      title: t('reports.repeatCustomers'),
      value: topCustomer ? `${topCustomer.name} ${topCustomer.lastName || ''}`.trim() : 'Sin datos',
      hint: 'Ver subpestaña de clientes',
      series: customersSeries
    },
    {
      id: 'outOfStock',
      title: t('reports.outOfStockProducts'),
      value: String(outOfStockProducts?.length || 0),
      hint: 'Ver subpestaña de stock',
      series: outOfStockSeries
    },
    {
      id: 'leastSold',
      title: t('reports.leastSold'),
      value: String(leastSoldProducts?.length || 0),
      hint: 'Ver subpestaña de baja salida',
      series: leastSoldSeries
    },
    {
      id: 'salesTrend',
      title: t('reports.salesTrend'),
      value: lastDaily ? `$${Number(lastDaily.total || 0).toFixed(2)}` : 'Sin datos',
      hint: 'Ver subpestaña de tendencia',
      series: dailySeries
    },
    {
      id: 'paymentMethods',
      title: t('reports.paymentMethods'),
      value: String(paymentMethodsCount),
      hint: 'Ver subpestaña de métodos',
      series: paymentSeries
    }
  ]

  const activeTile = reportTiles.find((tile) => tile.id === activeTab) || reportTiles[0]
  const isDetailRoute = Boolean(tabId)
  const buildReportTabHref = (reportTabId) => `/finanzas/reportes/${encodeURIComponent(reportTabId)}`

  const renderSubtabContent = () => {
    switch (activeTab) {
      case 'dailyTotal':
        return (
          <div className="reports__detail-block">
            <p className="reports__detail-value">{formatCurrency(dailyTotal)}</p>
            <p className="reports__detail-note">Total actual del periodo seleccionado.</p>
            <div className="reports__detail-subsection">
              <p className="reports__detail-note">Productos vendidos hoy</p>
              <ul className="reports__detail-list">
                {dailySoldProducts.length === 0
                  ? <li>Sin productos vendidos hoy.</li>
                  : dailySoldProducts.map((product) => (
                    <li key={product.id || product.code || product.name}>
                      {product.name} ({product.code || 'Sin código'}) - {product.quantitySold} pza(s) - {formatCurrency(product.revenue)}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )
      case 'monthlyTotal':
        return (
          <div className="reports__detail-block">
            <p className="reports__detail-value">{formatCurrency(monthlySummary?.total || 0)}</p>
            <p className="reports__detail-note">Acumulado mensual con base en ventas registradas.</p>
          </div>
        )
      case 'topProducts':
        return (
          <ul className="reports__detail-list">
            {topProducts.length === 0 ? <li>Sin datos</li> : topProducts.map((p, idx) => <li key={`${p.name}-${idx}`}>{p.name}: {p.quantity}</li>)}
          </ul>
        )
      case 'repeatCustomers':
        return (
          <ul className="reports__detail-list">
            {repeatCustomers.length === 0 ? <li>{t('reports.noRepeatCustomers')}</li> : repeatCustomers.map((c, idx) => <li key={`${c.id || idx}`}>{c.name} {c.lastName} - {c.purchaseCount} compras</li>)}
          </ul>
        )
      case 'outOfStock':
        return (
          <ul className="reports__detail-list">
            {outOfStockProducts.length === 0 ? <li>{t('reports.allInStock')}</li> : outOfStockProducts.map((p) => <li key={p.id}>{p.code} - {p.name}</li>)}
          </ul>
        )
      case 'leastSold':
        return (
          <ul className="reports__detail-list">
            {leastSoldProducts.length === 0 ? <li>{t('reports.noDataAvailable')}</li> : leastSoldProducts.map((p, idx) => <li key={`${p.id || idx}`}>{p.name} - {p.quantitySold}</li>)}
          </ul>
        )
      case 'salesTrend':
        return (
          <ul className="reports__detail-list">
            {(monthlySummary?.dailySales || []).length === 0
              ? <li>Sin datos</li>
              : monthlySummary.dailySales.map((d, idx) => <li key={`${d.date}-${idx}`}>{d.date}: ${Number(d.total || 0).toFixed(2)}</li>)}
          </ul>
        )
      case 'paymentMethods':
        return (
          <ul className="reports__detail-list">
            {(monthlySummary?.paymentMethods || []).length === 0
              ? <li>Sin datos</li>
              : monthlySummary.paymentMethods.map((pm, idx) => <li key={`${pm.name}-${idx}`}>{pm.name}: ${Number(pm.value || 0).toFixed(2)}</li>)}
          </ul>
        )
      default:
        return <p className="reports__detail-value">{Number(profitMargin?.percentage ?? 0).toFixed(1)}%</p>
    }
  }

  const renderDetailMetrics = () => {
    const deltaPositive = mainComparison.delta >= 0

    return (
      <div className="reports__metrics-grid">
        <article className="reports__metric-card">
          <div className="reports__metric-label">Actual</div>
          <div className="reports__metric-value">{formatMetricValue(mainStats.current)}</div>
        </article>
        <article className="reports__metric-card">
          <div className="reports__metric-label">Promedio</div>
          <div className="reports__metric-value">{formatMetricValue(mainStats.average)}</div>
        </article>
        <article className="reports__metric-card">
          <div className="reports__metric-label">Pico</div>
          <div className="reports__metric-value">{formatMetricValue(mainStats.max)}</div>
        </article>
        <article className="reports__metric-card">
          <div className="reports__metric-label">Mínimo</div>
          <div className="reports__metric-value">{formatMetricValue(mainStats.min)}</div>
        </article>
        <article className="reports__metric-card reports__metric-card--comparison">
          <div className="reports__metric-label">Vs periodo previo</div>
          <div className={`reports__metric-value ${deltaPositive ? 'reports__metric-value--up' : 'reports__metric-value--down'}`}>
            {deltaPositive ? '+' : ''}{mainComparison.deltaPct.toFixed(1)}%
          </div>
          <div className="reports__metric-subtext">
            {formatMetricValue(mainComparison.current)} vs {formatMetricValue(mainComparison.previous)}
          </div>
        </article>
      </div>
    )
  }

  return (
    <div className="reports">
      <header className="reports__header">
        <div className="reports__header-content">
          <div>
            <h1 className="reports__title">{t('reports.title')}</h1>
            <p className="reports__subtitle">{t('reports.subtitle')}</p>
          </div>
          <div className="reports__period-selector">
            <select 
              className="reports__period-select"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="today">{t('reports.today')}</option>
              <option value="week">{t('reports.week')}</option>
              <option value="month">{t('reports.month')}</option>
              <option value="custom">{t('reports.custom')}</option>
            </select>
            {selectedPeriod === 'custom' && (
              <div className="reports__date-range">
                <input
                  type="date"
                  className="reports__date-input"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
                <span className="reports__date-separator">{t('reports.dateTo')}</span>
                <input
                  type="date"
                  className="reports__date-input"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="reports__content">
        {loading ? (
          <div className="reports__loading">{t('reports.loadingReports')}</div>
        ) : (
          <>
            {!isDetailRoute && (
              <section className="reports__tiles" aria-label="Resumen de reportes">
                {reportTiles.map((tile) => (
                  <a
                    key={tile.id}
                    href={buildReportTabHref(tile.id)}
                    className="reports__tile-link"
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(buildReportTabHref(tile.id))
                    }}
                  >
                    <article className="reports__tile">
                      <h3 className="reports__tile-title">{tile.title}</h3>
                      {getSparklinePath(tile.series || []) ? (
                        <svg className="reports__tile-chart" viewBox="0 0 120 42" role="img" aria-label={`Mini grafica de ${tile.title}`}>
                          <path d={getSparklinePath(tile.series || [])} className="reports__tile-line" />
                        </svg>
                      ) : (
                        <div className="reports__tile-chart-empty">Sin datos</div>
                      )}
                      <p className="reports__tile-value">{tile.value}</p>
                      <p className="reports__tile-hint">{tile.hint}</p>
                    </article>
                  </a>
                ))}
              </section>
            )}

            <section className="reports__subtab" aria-label="Subpestaña de reporte">
              <article className="reports__detail-card">
                {isDetailRoute && (
                  <button
                    type="button"
                    onClick={() => navigate('/reports')}
                    className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1 text-xs text-[var(--text)]"
                  >
                    Volver a recuadros
                  </button>
                )}
                <h3 className="reports__detail-title">{activeTile.title}</h3>
                <div className="reports__big-chart-wrap">
                  {getSparklinePath(mainSeries, chartWidth, chartHeight, 12) ? (
                    <svg className="reports__big-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`Grafica grande de ${activeTile.title}`}>
                      <path d={getSparklinePath(mainSeries, chartWidth, chartHeight, 12)} className="reports__big-chart-line" />
                    </svg>
                  ) : (
                    <div className="reports__big-chart-empty">Sin datos suficientes para graficar</div>
                  )}
                </div>

                {renderDetailMetrics()}
                {renderSubtabContent()}
              </article>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default Reports