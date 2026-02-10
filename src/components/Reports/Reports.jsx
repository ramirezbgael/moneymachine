import React, { useState, useEffect } from 'react'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { useReportsStore } from '../../store/reportsStore'
import { useSettingsStore } from '../../store/settingsStore'
import './Reports.css'

/**
 * Reports view component
 * Sales reports and analytics with charts
 */
const Reports = () => {
  const t = useSettingsStore((s) => s.t)
  const { 
    dailyTotal, 
    topProducts, 
    repeatCustomers, 
    outOfStockProducts,
    monthlySummary,
    profitMargin,
    leastSoldProducts,
    loading,
    fetchDailyReport,
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

  useEffect(() => {
    loadAllReports()
  }, [selectedPeriod, dateRange])

  const loadAllReports = async () => {
    await Promise.all([
      fetchDailyReport(selectedPeriod === 'custom' ? dateRange : null),
      fetchTopProducts(10),
      fetchRepeatCustomers(),
      fetchOutOfStock(),
      fetchMonthlySummary(),
      fetchProfitMargin(),
      fetchLeastSold(10)
    ])
  }

  // Chart colors - Premium palette
  const COLORS = {
    primary: '#00ff88',
    secondary: 'rgba(255, 255, 255, 0.25)',
    grid: 'rgba(255, 255, 255, 0.06)',
    text: 'rgba(255, 255, 255, 0.45)',
    success: '#00ff88',
    warning: '#93C5FD',
    accent: '#7CB8FC'
  }

  const pieColors = ['#00ff88', '#33ffa3', '#66ffbb', 'rgba(255, 255, 255, 0.15)']

  return (
    <div className="reports">
      {/* Header */}
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

      {/* Content */}
      <div className="reports__content">
        {loading ? (
          <div className="reports__loading">{t('reports.loadingReports')}</div>
        ) : (
          <>
            {/* Summary Cards */}
            <section className="reports__summary">
              <div className="reports__summary-card">
                <div className="reports__summary-label">{t('reports.dailyTotal')}</div>
                <div className="reports__summary-value">${Number(dailyTotal).toFixed(2)}</div>
              </div>
              <div className="reports__summary-card">
                <div className="reports__summary-label">{t('reports.monthlyTotal')}</div>
                <div className="reports__summary-value">${Number(monthlySummary?.total ?? 0).toFixed(2)}</div>
              </div>
              <div className="reports__summary-card">
                <div className="reports__summary-label">{t('reports.profitMargin')}</div>
                <div className="reports__summary-value">{Number(profitMargin?.percentage ?? 0).toFixed(1)}%</div>
              </div>
              <div className="reports__summary-card">
                <div className="reports__summary-label">{t('reports.outOfStock')}</div>
                <div className="reports__summary-value">{outOfStockProducts?.length || 0}</div>
              </div>
            </section>

            {/* Charts Grid */}
            <section className="reports__charts">
              {/* Top Products Chart */}
              <div className="reports__chart-card">
                <h3 className="reports__chart-title">{t('reports.topProducts')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts} margin={{ top: 10, right: 10, left: 0, bottom: 120 }}>
                    <CartesianGrid 
                      strokeDasharray="0" 
                      stroke={COLORS.grid} 
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="name" 
                      stroke="transparent"
                      fontSize={11}
                      angle={-90}
                      textAnchor="end"
                      interval={0}
                      tick={{ fill: COLORS.text, textAnchor: 'end' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="transparent"
                      fontSize={12}
                      tick={{ fill: COLORS.text }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        background: 'rgba(18, 18, 26, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(16px)',
                        color: '#F5F5F7',
                        padding: '12px 16px'
                      }}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                    />
                    <Bar 
                      dataKey="quantity" 
                      fill={COLORS.primary} 
                      radius={[6, 6, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Sales Trend Chart */}
              <div className="reports__chart-card">
                <h3 className="reports__chart-title">{t('reports.salesTrend')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlySummary?.dailySales || []}>
                    <CartesianGrid 
                      strokeDasharray="0" 
                      stroke={COLORS.grid}
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="date" 
                      stroke="transparent"
                      fontSize={12}
                      tick={{ fill: COLORS.text }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="transparent"
                      fontSize={12}
                      tick={{ fill: COLORS.text }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        background: 'rgba(18, 18, 26, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(16px)',
                        color: '#F5F5F7',
                        padding: '12px 16px'
                      }}
                      cursor={{ stroke: 'rgba(0, 255, 136, 0.3)', strokeWidth: 1 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke={COLORS.primary} 
                      strokeWidth={2.5}
                      dot={{ 
                        fill: COLORS.primary, 
                        r: 4,
                        strokeWidth: 2,
                        stroke: 'rgba(11, 11, 15, 0.8)'
                      }}
                      activeDot={{ 
                        r: 6,
                        fill: COLORS.primary,
                        stroke: 'rgba(11, 11, 15, 0.8)',
                        strokeWidth: 2
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Methods Distribution */}
              <div className="reports__chart-card">
                <h3 className="reports__chart-title">{t('reports.paymentMethods')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={monthlySummary?.paymentMethods || []}
                      cx="50%"
                      cy="50%"
                      labelLine={{
                        stroke: 'rgba(255, 255, 255, 0.15)',
                        strokeWidth: 1
                      }}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="rgba(11, 11, 15, 0.8)"
                      strokeWidth={2}
                    >
                      {(monthlySummary?.paymentMethods || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        background: 'rgba(18, 18, 26, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(16px)',
                        color: '#F5F5F7',
                        padding: '12px 16px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Profit vs Investment */}
              <div className="reports__chart-card">
                <h3 className="reports__chart-title">{t('reports.profitVsInvestment')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={profitMargin?.breakdown || []}>
                    <CartesianGrid 
                      strokeDasharray="0" 
                      stroke={COLORS.grid}
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="label" 
                      stroke="transparent"
                      fontSize={12}
                      tick={{ fill: COLORS.text }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="transparent"
                      fontSize={12}
                      tick={{ fill: COLORS.text }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        background: 'rgba(18, 18, 26, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(16px)',
                        color: '#F5F5F7',
                        padding: '12px 16px'
                      }}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                    />
                    <Legend 
                      wrapperStyle={{ color: COLORS.text }}
                      iconType="circle"
                    />
                    <Bar 
                      dataKey="investment" 
                      fill="rgba(255, 255, 255, 0.12)" 
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar 
                      dataKey="profit" 
                      fill={COLORS.primary} 
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Data Tables */}
            <section className="reports__tables">
              {/* Repeat Customers */}
              <div className="reports__table-card">
                <h3 className="reports__table-title">{t('reports.repeatCustomers')}</h3>
                <div className="reports__table-container">
                  <table className="reports__table">
                    <thead>
                      <tr>
                        <th>{t('reports.customer')}</th>
                        <th>{t('reports.phone')}</th>
                        <th>{t('reports.totalPurchases')}</th>
                        <th>{t('reports.totalSpent')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repeatCustomers.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="reports__empty">{t('reports.noRepeatCustomers')}</td>
                        </tr>
                      ) : (
                        repeatCustomers.map((customer, index) => (
                          <tr key={index}>
                            <td>{customer.name} {customer.lastName}</td>
                            <td>{customer.phone}</td>
                            <td>{customer.purchaseCount}</td>
                            <td>${customer.totalSpent.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Out of Stock Products */}
              <div className="reports__table-card">
                <h3 className="reports__table-title">{t('reports.outOfStockProducts')}</h3>
                <div className="reports__table-container">
                  <table className="reports__table">
                    <thead>
                      <tr>
                        <th>{t('reports.code')}</th>
                        <th>{t('reports.name')}</th>
                        <th>{t('reports.lastSale')}</th>
                        <th>{t('reports.stock')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outOfStockProducts.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="reports__empty">{t('reports.allInStock')}</td>
                        </tr>
                      ) : (
                        outOfStockProducts.map((product) => (
                          <tr key={product.id}>
                            <td>{product.code}</td>
                            <td>{product.name}</td>
                            <td>{product.lastSaleDate ? new Date(product.lastSaleDate).toLocaleDateString() : t('reports.never')}</td>
                            <td className="reports__stock-critical">{product.stock}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Least Sold Products */}
              <div className="reports__table-card">
                <h3 className="reports__table-title">{t('reports.leastSold')}</h3>
                <div className="reports__table-container">
                  <table className="reports__table">
                    <thead>
                      <tr>
                        <th>{t('reports.code')}</th>
                        <th>{t('reports.name')}</th>
                        <th>{t('reports.quantitySold')}</th>
                        <th>{t('reports.revenue')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leastSoldProducts.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="reports__empty">{t('reports.noDataAvailable')}</td>
                        </tr>
                      ) : (
                        leastSoldProducts.map((product) => (
                          <tr key={product.id}>
                            <td>{product.code}</td>
                            <td>{product.name}</td>
                            <td>{product.quantitySold}</td>
                            <td>${product.revenue.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default Reports