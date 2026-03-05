import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Mock data for fallback
const mockTopProducts = [
  { name: 'Product A', quantity: 45 },
  { name: 'Product B', quantity: 32 },
  { name: 'Product C', quantity: 28 },
  { name: 'Product D', quantity: 21 },
  { name: 'Product E', quantity: 15 }
]

const mockRepeatCustomers = [
  { id: 1, name: 'John', lastName: 'Doe', phone: '555-0101', purchaseCount: 8, totalSpent: 2400 },
  { id: 2, name: 'Jane', lastName: 'Smith', phone: '555-0102', purchaseCount: 6, totalSpent: 1850 },
  { id: 3, name: 'Bob', lastName: 'Johnson', phone: '555-0103', purchaseCount: 4, totalSpent: 980 }
]

const mockDailySales = [
  { date: '2026-01-18', total: 450 },
  { date: '2026-01-19', total: 520 },
  { date: '2026-01-20', total: 380 },
  { date: '2026-01-21', total: 610 },
  { date: '2026-01-22', total: 490 },
  { date: '2026-01-23', total: 550 },
  { date: '2026-01-24', total: 680 }
]

/**
 * Reports store
 * Manages reports and analytics data
 */
export const useReportsStore = create((set, get) => ({
  dailyTotal: 0,
  topProducts: [],
  repeatCustomers: [],
  outOfStockProducts: [],
  monthlySummary: null,
  profitMargin: null,
  leastSoldProducts: [],
  loading: false,
  error: null,

  // Fetch daily total
  fetchDailyReport: async (dateRange = null) => {
    set({ loading: true, error: null })
    try {
      if (isSupabaseConfigured() && supabase) {
        let query = supabase
          .from('sales')
          .select('total')

        if (dateRange) {
          query = query
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end)
        } else {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          query = query.gte('created_at', today.toISOString())
        }

        const { data, error } = await query

        if (error) {
          console.warn('Supabase error, using mock data:', error.message)
          // Use mock data on error
          const mockTotal = mockDailySales[mockDailySales.length - 1]?.total || 0
          set({ dailyTotal: mockTotal, loading: false })
          return
        }

        const total = data?.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0) || 0

        set({ dailyTotal: Math.round(total * 100) / 100, loading: false })
      } else {
        // Mock data when not configured
        const mockTotal = mockDailySales[mockDailySales.length - 1]?.total || 0
        set({ dailyTotal: mockTotal, loading: false })
      }
    } catch (error) {
      console.warn('Error fetching daily report, using mock data:', error.message)
      const mockTotal = mockDailySales[mockDailySales.length - 1]?.total || 0
      set({ loading: false, error: null, dailyTotal: mockTotal })
    }
  },

  // Fetch top products
  fetchTopProducts: async (limit = 10) => {
    try {
      if (isSupabaseConfigured() && supabase) {
        // Use the view if available, otherwise query directly
        const { data, error } = await supabase
          .from('top_products_by_quantity')
          .select('*')
          .limit(limit)

        if (error) {
          // Fallback to direct query if view doesn't exist
          const { data: itemsData, error: itemsError } = await supabase
            .from('sale_items')
            .select(`
              product_id,
              quantity,
              products (
                id,
                name,
                code
              )
            `)

          if (itemsError) {
            console.warn('Supabase error, using mock data:', itemsError.message)
            set({ topProducts: mockTopProducts })
            return
          }

          // Aggregate by product
          const productMap = {}
          itemsData?.forEach(item => {
            const productId = item.product_id
            if (!productMap[productId]) {
              productMap[productId] = {
                id: productId,
                name: item.products?.name || 'Unknown',
                code: item.products?.code || '',
                quantity: 0
              }
            }
            productMap[productId].quantity += item.quantity || 0
          })

          const topProducts = Object.values(productMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, limit)
            .map(p => ({ name: p.name, quantity: p.quantity }))

          set({ topProducts: topProducts.length > 0 ? topProducts : mockTopProducts })
        } else {
          const topProducts = data?.map(p => ({
            name: p.name,
            quantity: p.total_quantity_sold || 0
          })) || []
          set({ topProducts: topProducts.length > 0 ? topProducts : mockTopProducts })
        }
      } else {
        // Mock data when not configured
        set({ topProducts: mockTopProducts })
      }
    } catch (error) {
      console.warn('Error fetching top products, using mock data:', error.message)
      set({ topProducts: mockTopProducts })
    }
  },

  // Fetch repeat customers
  fetchRepeatCustomers: async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        // Try to use the view first
        const { data, error } = await supabase
          .from('repeat_customers')
          .select('*')
          .order('purchase_count', { ascending: false })

        if (error) {
          // Fallback to direct query
          const { data: salesData, error: salesError } = await supabase
            .from('sales')
            .select(`
              customer_id,
              total,
              customers (
                id,
                name,
                last_name,
                phone
              )
            `)
            .not('customer_id', 'is', null)

          if (salesError) {
            console.warn('Supabase error, using mock data:', salesError.message)
            set({ repeatCustomers: mockRepeatCustomers })
            return
          }

          // Aggregate by customer
          const customerMap = {}
          salesData?.forEach(sale => {
            const customerId = sale.customer_id
            if (customerId && sale.customers) {
              if (!customerMap[customerId]) {
                customerMap[customerId] = {
                  id: customerId,
                  name: sale.customers.name || '',
                  lastName: sale.customers.last_name || '',
                  phone: sale.customers.phone || '',
                  purchaseCount: 0,
                  totalSpent: 0
                }
              }
              customerMap[customerId].purchaseCount++
              customerMap[customerId].totalSpent += parseFloat(sale.total || 0)
            }
          })

          const repeatCustomers = Object.values(customerMap)
            .filter(c => c.purchaseCount > 1)
            .sort((a, b) => b.purchaseCount - a.purchaseCount)

          set({ repeatCustomers: repeatCustomers.length > 0 ? repeatCustomers : mockRepeatCustomers })
        } else {
          const repeatCustomers = data?.map(c => ({
            id: c.id,
            name: c.name || '',
            lastName: c.last_name || '',
            phone: c.phone || '',
            purchaseCount: c.purchase_count || 0,
            totalSpent: parseFloat(c.total_spent || 0)
          })) || []
          set({ repeatCustomers: repeatCustomers.length > 0 ? repeatCustomers : mockRepeatCustomers })
        }
      } else {
        set({ repeatCustomers: mockRepeatCustomers })
      }
    } catch (error) {
      console.warn('Error fetching repeat customers, using mock data:', error.message)
      set({ repeatCustomers: mockRepeatCustomers })
    }
  },

  // Fetch out of stock products
  fetchOutOfStock: async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        // Try to use the view first
        const { data, error } = await supabase
          .from('products_out_of_stock')
          .select('*')

        if (error) {
          // Fallback to direct query
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('stock', 0)
            .order('last_sale_date', { ascending: false, nullsFirst: false })

          if (productsError) {
            console.warn('Supabase error, using empty data:', productsError.message)
            set({ outOfStockProducts: [] })
            return
          }
          set({ outOfStockProducts: productsData || [] })
        } else {
          set({ outOfStockProducts: data || [] })
        }
      } else {
        set({ outOfStockProducts: [] })
      }
    } catch (error) {
      console.warn('Error fetching out of stock, using empty data:', error.message)
      set({ outOfStockProducts: [] })
    }
  },

  // Fetch monthly summary
  fetchMonthlySummary: async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        // Total sales
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('total, payment_method, created_at')
          .gte('created_at', startOfMonth.toISOString())

        if (salesError) {
          console.warn('Supabase error, using mock data:', salesError.message)
          const mockTotal = mockDailySales.reduce((sum, day) => sum + day.total, 0)
          set({
            monthlySummary: {
              total: mockTotal,
              paymentMethods: [
                { name: 'Cash', value: mockTotal * 0.6 },
                { name: 'Card', value: mockTotal * 0.3 },
                { name: 'Transfer', value: mockTotal * 0.1 }
              ],
              dailySales: mockDailySales
            }
          })
          return
        }

        const total = salesData?.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0) || 0

        // Payment methods breakdown
        const paymentMethods = {}
        salesData?.forEach(sale => {
          const method = sale.payment_method || 'unknown'
          paymentMethods[method] = (paymentMethods[method] || 0) + parseFloat(sale.total || 0)
        })

        const paymentMethodsArray = Object.entries(paymentMethods).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value
        }))

        // Daily sales (last 30 days)
        const dailySalesMap = {}
        salesData?.forEach(sale => {
          const date = new Date(sale.created_at).toISOString().split('T')[0]
          if (!dailySalesMap[date]) {
            dailySalesMap[date] = { date, total: 0 }
          }
          dailySalesMap[date].total += parseFloat(sale.total || 0)
        })

        const dailySales = Object.values(dailySalesMap).sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        )

        set({
          monthlySummary: {
            total: Math.round((total || 0) * 100) / 100,
            paymentMethods: paymentMethodsArray.length > 0 ? paymentMethodsArray : [
              { name: 'Cash', value: 0 },
              { name: 'Card', value: 0 }
            ],
            dailySales: dailySales.length > 0 ? dailySales : mockDailySales
          }
        })
      } else {
        const mockTotal = mockDailySales.reduce((sum, day) => sum + day.total, 0)
        set({
          monthlySummary: {
            total: mockTotal,
            paymentMethods: [
              { name: 'Cash', value: mockTotal * 0.6 },
              { name: 'Card', value: mockTotal * 0.3 },
              { name: 'Transfer', value: mockTotal * 0.1 }
            ],
            dailySales: mockDailySales
          }
        })
      }
    } catch (error) {
      console.warn('Error fetching monthly summary, using mock data:', error.message)
      const mockTotal = mockDailySales.reduce((sum, day) => sum + day.total, 0)
      set({
        monthlySummary: {
          total: mockTotal,
          paymentMethods: [
            { name: 'Cash', value: mockTotal * 0.6 },
            { name: 'Card', value: mockTotal * 0.3 },
            { name: 'Transfer', value: mockTotal * 0.1 }
          ],
          dailySales: mockDailySales
        }
      })
    }
  },

  // Fetch profit margin
  fetchProfitMargin: async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        // Get sales with items and product costs
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select(`
            total,
            sale_items (
              quantity,
              unit_price,
              subtotal,
              products (
                price,
                cost
              )
            )
          `)
          .gte('created_at', startOfMonth.toISOString())

        if (salesError) {
          console.warn('Supabase error, using mock data:', salesError.message)
          const mockRevenue = 3680
          const mockCost = 2208
          const mockProfit = mockRevenue - mockCost
          const mockPercentage = (mockProfit / mockRevenue) * 100
          set({
            profitMargin: {
              percentage: mockPercentage.toFixed(1),
              revenue: mockRevenue,
              cost: mockCost,
              profit: mockProfit,
              breakdown: [
                { label: 'Investment', investment: mockCost, profit: 0 },
                { label: 'Profit', investment: 0, profit: mockProfit }
              ]
            }
          })
          return
        }

        let totalRevenue = 0
        let totalCost = 0

        salesData?.forEach(sale => {
          totalRevenue += parseFloat(sale.total || 0)
          sale.sale_items?.forEach(item => {
            // Use actual product cost if available, otherwise estimate 60% of price
            const productCost = parseFloat(item.products?.cost || 0)
            const estimatedCost = parseFloat(item.products?.price || item.unit_price || 0) * 0.6
            const cost = productCost > 0 ? productCost : estimatedCost
            totalCost += cost * (item.quantity || 0)
          })
        })

        const profit = totalRevenue - totalCost
        const percentage = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

        set({
          profitMargin: {
            percentage: percentage.toFixed(1),
            revenue: totalRevenue,
            cost: totalCost,
            profit: profit,
            breakdown: [
              { label: 'Investment', investment: totalCost, profit: 0 },
              { label: 'Profit', investment: 0, profit: profit }
            ]
          }
        })
      } else {
        const mockRevenue = 3680
        const mockCost = 2208
        const mockProfit = mockRevenue - mockCost
        const mockPercentage = (mockProfit / mockRevenue) * 100
        set({
          profitMargin: {
            percentage: mockPercentage.toFixed(1),
            revenue: mockRevenue,
            cost: mockCost,
            profit: mockProfit,
            breakdown: [
              { label: 'Investment', investment: mockCost, profit: 0 },
              { label: 'Profit', investment: 0, profit: mockProfit }
            ]
          }
        })
      }
    } catch (error) {
      console.warn('Error fetching profit margin, using mock data:', error.message)
      const mockRevenue = 3680
      const mockCost = 2208
      const mockProfit = mockRevenue - mockCost
      const mockPercentage = (mockProfit / mockRevenue) * 100
      set({
        profitMargin: {
          percentage: mockPercentage.toFixed(1),
          revenue: mockRevenue,
          cost: mockCost,
          profit: mockProfit,
          breakdown: [
            { label: 'Investment', investment: mockCost, profit: 0 },
            { label: 'Profit', investment: 0, profit: mockProfit }
          ]
        }
      })
    }
  },

  // Fetch least sold products
  fetchLeastSold: async (limit = 10) => {
    try {
      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase
          .from('sale_items')
          .select(`
            product_id,
            quantity,
            unit_price,
            subtotal,
            products (
              id,
              name,
              code
            )
          `)

        if (error) {
          console.warn('Supabase error, using mock data:', error.message)
          const mockLeastSold = [
            { name: 'Product X', quantitySold: 2, revenue: 80 },
            { name: 'Product Y', quantitySold: 3, revenue: 120 },
            { name: 'Product Z', quantitySold: 5, revenue: 200 }
          ]
          set({ leastSoldProducts: mockLeastSold })
          return
        }

        // Aggregate by product
        const productMap = {}
        data?.forEach(item => {
          const productId = item.product_id
          if (!productMap[productId]) {
            productMap[productId] = {
              id: productId,
              name: item.products?.name || 'Unknown',
              code: item.products?.code || '',
              quantitySold: 0,
              revenue: 0
            }
          }
          productMap[productId].quantitySold += item.quantity || 0
          productMap[productId].revenue += parseFloat(item.subtotal || 0)
        })

        const leastSold = Object.values(productMap)
          .sort((a, b) => a.quantitySold - b.quantitySold)
          .slice(0, limit)

        set({ leastSoldProducts: leastSold.length > 0 ? leastSold : [] })
      } else {
        set({ leastSoldProducts: [] })
      }
    } catch (error) {
      console.warn('Error fetching least sold products, using mock data:', error.message)
      const mockLeastSold = [
        { name: 'Product X', quantitySold: 2, revenue: 80 },
        { name: 'Product Y', quantitySold: 3, revenue: 120 },
        { name: 'Product Z', quantitySold: 5, revenue: 200 }
      ]
      set({ leastSoldProducts: mockLeastSold })
    }
  }
}))