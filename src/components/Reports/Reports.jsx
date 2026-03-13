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
    dailyTickets,
    dailySoldProducts,
    financialSummary,
    cashSessionsHistory,
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
    fetchLeastSold,
    fetchFinancialSummary,
    fetchCashSessionsHistory
  } = useReportsStore()

  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [dailySortBy, setDailySortBy] = useState('quantity')
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
      fetchLeastSold(10),
      fetchFinancialSummary(),
      fetchCashSessionsHistory()
    ])
  }

  const topProduct = topProducts[0]
  const topCustomer = repeatCustomers[0]
  const lastDaily = monthlySummary?.dailySales?.slice(-1)?.[0]
  const paymentMethodsCount = monthlySummary?.paymentMethods?.length || 0
  const closedCashSessions = (cashSessionsHistory || []).filter((session) => session.status === 'closed')
  const shortageSessionsCount = closedCashSessions.filter((session) => {
    const opening = Number(session.opening_amount || 0)
    const closing = Number(session.closing_amount || 0)
    return closing - opening < -0.009
  }).length
  const shortageTotal = closedCashSessions.reduce((acc, session) => {
    const opening = Number(session.opening_amount || 0)
    const closing = Number(session.closing_amount || 0)
    const delta = closing - opening
    return delta < 0 ? acc + Math.abs(delta) : acc
  }, 0)
  const currentCashCounter = Number(financialSummary?.currentCash || 0)

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
  const formatCurrencyCompact = (value) =>
    `$${Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

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

  const mainStats = getSeriesStats(mainSeries)

  const dailySalesData = monthlySummary?.dailySales || []
  const todaySales = Number(dailyTotal ?? 0)
  const yesterdaySales = Number(dailySalesData[dailySalesData.length - 2]?.total ?? 0)
  const todayDelta = todaySales - yesterdaySales
  const todayDeltaPct = yesterdaySales === 0 ? (todaySales > 0 ? 100 : 0) : (todayDelta / yesterdaySales) * 100
  const todayTrendPositive = todayDelta >= 0

  const formatMetricValue = (value) => {
    if (activeTab === 'dailyTotal' || activeTab === 'monthlyTotal' || activeTab === 'salesTrend' || activeTab === 'paymentMethods') {
      return formatCurrencyCompact(value)
    }
    return Number(value || 0).toFixed(0)
  }

  const chartWidth = 760
  const chartHeight = 300
  const totalProductsSold = dailySoldProducts.reduce((sum, p) => sum + Number(p.quantitySold || 0), 0)
  const averageTicket = dailyTickets > 0 ? todaySales / dailyTickets : 0
  const sortedDailyProducts = [...dailySoldProducts].sort((a, b) => {
    if (dailySortBy === 'revenue') {
      return Number(b.revenue || 0) - Number(a.revenue || 0)
    }
    return Number(b.quantitySold || 0) - Number(a.quantitySold || 0)
  })
  const dailyPreviewProducts = sortedDailyProducts.slice(0, 3)

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
  const buildReportTabHref = (reportTabId) => `/finance/reports/${encodeURIComponent(reportTabId)}`

  const renderSubtabContent = () => {
    switch (activeTab) {
      case 'dailyTotal':
        return (
          <div className="reports__daily-layout">
            <div className="reports__metrics-grid reports__metrics-grid--daily">
              <article className="reports__metric-card">
                <div className="reports__metric-label">Ventas hoy</div>
                <div className="reports__metric-value">{formatCurrencyCompact(todaySales)}</div>
              </article>
              <article className="reports__metric-card">
                <div className="reports__metric-label">Total de tickets</div>
                <div className="reports__metric-value">{Number(dailyTickets || 0).toLocaleString('es-MX')}</div>
              </article>
              <article className="reports__metric-card">
                <div className="reports__metric-label">Ticket promedio</div>
                <div className="reports__metric-value">{formatCurrencyCompact(averageTicket)}</div>
              </article>
              <article className="reports__metric-card">
                <div className="reports__metric-label">Productos vendidos</div>
                <div className="reports__metric-value">{Number(totalProductsSold || 0).toLocaleString('es-MX')}</div>
              </article>
            </div>

            <div className="reports__daily-table-wrap">
              <div className="reports__daily-table-toolbar">
                <h4>Top productos vendidos</h4>
                <label className="reports__sort-control">
                  Ordenar por
                  <select value={dailySortBy} onChange={(e) => setDailySortBy(e.target.value)}>
                    <option value="quantity">Cantidad vendida</option>
                    <option value="revenue">Ingreso</option>
                  </select>
                </label>
              </div>

              <table className="reports__daily-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="is-right">Cantidad vendida</th>
                    <th className="is-right">Ingreso</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDailyProducts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="reports__daily-table-empty">Sin productos vendidos hoy.</td>
                    </tr>
                  )}
                  {sortedDailyProducts.map((product, idx) => (
                    <tr key={product.id || `${product.name}-${idx}`}>
                      <td className="reports__product-name" title={product.name}>{product.name}</td>
                      <td className="is-right">{Number(product.quantitySold || 0).toLocaleString('es-MX')}</td>
                      <td className="is-right">{formatCurrency(product.revenue || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      case 'monthlyTotal':
        return (
          <div className="reports__detail-block">
            <p className="reports__detail-note">Acumulado mensual: {formatCurrencyCompact(monthlySummary?.total || 0)}</p>
            <p className="reports__detail-note">Con base en ventas registradas.</p>
          </div>
        )
      case 'topProducts':
        return (
          <div className="reports__top-products">
            <div className="reports__top-products-head">
              <span>#</span>
              <span>Producto</span>
              <span className="is-right">Vendidos</span>
            </div>

            <div className="reports__top-products-body">
              {topProducts.length === 0 ? (
                <p className="reports__top-products-empty">Sin datos de productos vendidos.</p>
              ) : (
                topProducts.map((p, idx) => (
                  <article key={`${p.name}-${idx}`} className="reports__top-product-row">
                    <span className="reports__top-product-rank">{idx + 1}</span>
                    <span className="reports__top-product-name" title={p.name}>{p.name}</span>
                    <strong className="reports__top-product-qty">{Number(p.quantity || 0).toLocaleString('es-MX')}</strong>
                  </article>
                ))
              )}
            </div>
          </div>
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
    if (activeTab === 'dailyTotal') return null
    return (
      <div className="reports__metrics-grid">
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
      </div>
    )
  }

  const renderHeroTrendRow = (mode = 'daily') => {
    const isDailyMode = mode === 'daily'
    const leftLabel = isDailyMode ? 'Ventas hoy' : activeTile.title
    const leftValue = isDailyMode ? formatCurrency(todaySales) : activeTile.value
    const trendText = isDailyMode
      ? `${todayTrendPositive ? '+' : ''}${todayDeltaPct.toFixed(1)}% vs ayer`
      : 'Detalle del periodo seleccionado'

    return (
    <section className="reports__hero-row" aria-label="Ventas hoy y tendencia">
      <section className="reports__hero-kpi reports__hero-kpi-card" aria-label="Indicador principal">
        <p className="reports__hero-label">{leftLabel}</p>
        <p className="reports__hero-value">{leftValue}</p>
        <p className={`reports__hero-trend ${isDailyMode ? (todayTrendPositive ? 'reports__hero-trend--up' : 'reports__hero-trend--down') : ''}`}>
          {trendText}
        </p>

        {isDailyMode && (
          <div className="reports__hero-products">
            <p className="reports__hero-products-title">Productos vendidos</p>
            {dailyPreviewProducts.length === 0 ? (
              <p className="reports__hero-products-empty">Sin productos vendidos hoy</p>
            ) : (
              <ul className="reports__hero-products-list">
                {dailyPreviewProducts.map((product, idx) => (
                  <li key={product.id || `${product.name}-${idx}`}>
                    <span className="reports__hero-product-name" title={product.name}>{product.name}</span>
                    <strong>{Number(product.quantitySold || 0)}</strong>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="reports__hero-detail-btn"
              onClick={() => navigate('/finance/reports/dailyTotal')}
            >
              Ver todos a detalle
            </button>
          </div>
        )}
      </section>

      <div className="reports__big-chart-wrap reports__big-chart-wrap--hero">
        {getSparklinePath(mainSeries, chartWidth, chartHeight, 12) ? (
          <svg className="reports__big-chart reports__big-chart--hero" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`Grafica grande de ${activeTile.title}`}>
            <g>
              {Array.from({ length: 5 }).map((_, idx) => {
                const y = 12 + ((chartHeight - 24) / 4) * idx
                return (
                  <line
                    key={`grid-${idx}`}
                    x1="12"
                    y1={y}
                    x2={chartWidth - 12}
                    y2={y}
                    className="reports__big-chart-grid-line"
                  />
                )
              })}
            </g>
            <path d={getSparklinePath(mainSeries, chartWidth, chartHeight, 12)} className="reports__big-chart-line" />
          </svg>
        ) : (
          <div className="reports__big-chart-empty">Sin datos suficientes para graficar</div>
        )}
      </div>
    </section>
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
          <div className="reports__header-actions">
            {isDetailRoute && (
              <div className="reports__back-arrow-wrap">
                <button
                  type="button"
                  onClick={() => navigate('/finance/reports')}
                  className="reports__back-arrow"
                  aria-label="Volver a recuadros"
                  title="Volver a recuadros"
                >
                  ←
                </button>
              </div>
            )}
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
        </div>
      </header>

      <div className="reports__content">
        {loading ? (
          <div className="reports__loading">{t('reports.loadingReports')}</div>
        ) : (
          <>
            {!isDetailRoute && (
              <>
                <div className="reports__headline-section">
                  {renderHeroTrendRow()}
                </div>

                <section className="reports__metrics-grid reports__metrics-grid--cash" aria-label="Contadores de caja">
                  <article className="reports__metric-card">
                    <div className="reports__metric-label">Efectivo actual</div>
                    <div className="reports__metric-value">{formatCurrencyCompact(currentCashCounter)}</div>
                  </article>
                  <article className="reports__metric-card">
                    <div className="reports__metric-label">Cortes con faltante</div>
                    <div className="reports__metric-value">{Number(shortageSessionsCount || 0).toLocaleString('es-MX')}</div>
                  </article>
                  <article className="reports__metric-card">
                    <div className="reports__metric-label">Total de faltantes</div>
                    <div className="reports__metric-value">{formatCurrencyCompact(shortageTotal)}</div>
                  </article>
                </section>

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
              </>
            )}

            {isDetailRoute && (
              <section className="reports__subtab" aria-label="Subpestaña de reporte">
                <article className="reports__detail-card">
                  {renderHeroTrendRow(activeTab === 'dailyTotal' ? 'daily' : 'context')}
                  <h3 className="reports__detail-title">{activeTile.title}</h3>
                  {renderDetailMetrics()}
                  {renderSubtabContent()}
                </article>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Reports