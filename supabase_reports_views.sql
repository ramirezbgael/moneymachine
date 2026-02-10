-- ============================================
-- POS System - Reports Views and Functions
-- ============================================
-- Additional SQL for reports functionality
-- Run this AFTER the main schema
-- ============================================

-- ============================================
-- 1. VIEW: Daily Sales Summary
-- ============================================
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
  DATE(created_at) as sale_date,
  COUNT(*) as total_sales,
  SUM(total) as total_revenue,
  SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_revenue,
  SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card_revenue,
  SUM(CASE WHEN payment_method = 'transfer' THEN total ELSE 0 END) as transfer_revenue,
  COUNT(DISTINCT customer_id) as unique_customers
FROM sales
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- ============================================
-- 2. VIEW: Top Products by Quantity
-- ============================================
CREATE OR REPLACE VIEW top_products_by_quantity AS
SELECT 
  p.id,
  p.code,
  p.name,
  SUM(si.quantity) as total_quantity_sold,
  SUM(si.subtotal) as total_revenue,
  COUNT(DISTINCT si.sale_id) as times_sold
FROM products p
INNER JOIN sale_items si ON p.id = si.product_id
GROUP BY p.id, p.code, p.name
ORDER BY total_quantity_sold DESC;

-- ============================================
-- 3. VIEW: Repeat Customers
-- ============================================
CREATE OR REPLACE VIEW repeat_customers AS
SELECT 
  c.id,
  c.name,
  c.last_name,
  c.phone,
  c.email,
  COUNT(s.id) as purchase_count,
  SUM(s.total) as total_spent,
  MIN(s.created_at) as first_purchase,
  MAX(s.created_at) as last_purchase
FROM customers c
INNER JOIN sales s ON c.id = s.customer_id
GROUP BY c.id, c.name, c.last_name, c.phone, c.email
HAVING COUNT(s.id) > 1
ORDER BY purchase_count DESC, total_spent DESC;

-- ============================================
-- 4. VIEW: Products Out of Stock
-- ============================================
CREATE OR REPLACE VIEW products_out_of_stock AS
SELECT 
  id,
  code,
  barcode,
  name,
  description,
  price,
  stock,
  last_sale_date,
  created_at
FROM products
WHERE stock = 0
ORDER BY last_sale_date DESC NULLS LAST;

-- ============================================
-- 5. VIEW: Monthly Sales Summary
-- ============================================
CREATE OR REPLACE VIEW monthly_sales_summary AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_sales,
  SUM(total) as total_revenue,
  SUM(subtotal) as total_subtotal,
  SUM(tax) as total_tax,
  COUNT(DISTINCT customer_id) as unique_customers,
  COUNT(DISTINCT user_id) as active_users
FROM sales
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ============================================
-- 6. VIEW: Product Sales Performance
-- ============================================
CREATE OR REPLACE VIEW product_sales_performance AS
SELECT 
  p.id,
  p.code,
  p.name,
  p.price,
  p.stock,
  COALESCE(SUM(si.quantity), 0) as total_quantity_sold,
  COALESCE(SUM(si.subtotal), 0) as total_revenue,
  COALESCE(COUNT(DISTINCT si.sale_id), 0) as times_sold,
  COALESCE(MAX(s.created_at), NULL) as last_sale_date,
  CASE 
    WHEN COALESCE(SUM(si.quantity), 0) = 0 THEN 'No sales'
    WHEN COALESCE(SUM(si.quantity), 0) < 5 THEN 'Low sales'
    WHEN COALESCE(SUM(si.quantity), 0) < 20 THEN 'Medium sales'
    ELSE 'High sales'
  END as performance_category
FROM products p
LEFT JOIN sale_items si ON p.id = si.product_id
LEFT JOIN sales s ON si.sale_id = s.id
GROUP BY p.id, p.code, p.name, p.price, p.stock
ORDER BY total_quantity_sold ASC;

-- ============================================
-- 7. FUNCTION: Get Daily Report
-- ============================================
CREATE OR REPLACE FUNCTION get_daily_report(report_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_sales BIGINT,
  total_revenue DECIMAL,
  cash_revenue DECIMAL,
  card_revenue DECIMAL,
  transfer_revenue DECIMAL,
  unique_customers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_sales,
    COALESCE(SUM(total), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_revenue,
    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0) as card_revenue,
    COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total ELSE 0 END), 0) as transfer_revenue,
    COUNT(DISTINCT customer_id)::BIGINT as unique_customers
  FROM sales
  WHERE DATE(created_at) = report_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. FUNCTION: Get Date Range Report
-- ============================================
CREATE OR REPLACE FUNCTION get_date_range_report(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  total_sales BIGINT,
  total_revenue DECIMAL,
  average_sale DECIMAL,
  unique_customers BIGINT,
  top_product_id BIGINT,
  top_product_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH sales_summary AS (
    SELECT 
      COUNT(*)::BIGINT as total_sales,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(AVG(total), 0) as average_sale,
      COUNT(DISTINCT customer_id)::BIGINT as unique_customers
    FROM sales
    WHERE DATE(created_at) BETWEEN start_date AND end_date
  ),
  top_product AS (
    SELECT 
      si.product_id,
      p.name,
      SUM(si.quantity) as total_qty
    FROM sale_items si
    INNER JOIN sales s ON si.sale_id = s.id
    INNER JOIN products p ON si.product_id = p.id
    WHERE DATE(s.created_at) BETWEEN start_date AND end_date
    GROUP BY si.product_id, p.name
    ORDER BY total_qty DESC
    LIMIT 1
  )
  SELECT 
    ss.total_sales,
    ss.total_revenue,
    ss.average_sale,
    ss.unique_customers,
    COALESCE(tp.product_id, NULL)::BIGINT as top_product_id,
    COALESCE(tp.name, 'N/A') as top_product_name
  FROM sales_summary ss
  CROSS JOIN LATERAL (SELECT * FROM top_product LIMIT 1) tp;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. VIEW: Profit Analysis (requires cost field in products)
-- ============================================
-- Note: This assumes you add a 'cost' field to products table
-- If not, you can calculate based on a percentage of price
CREATE OR REPLACE VIEW profit_analysis AS
SELECT 
  DATE_TRUNC('month', s.created_at) as month,
  SUM(s.total) as total_revenue,
  SUM(si.quantity * COALESCE(p.cost, p.price * 0.6)) as total_cost,
  SUM(s.total) - SUM(si.quantity * COALESCE(p.cost, p.price * 0.6)) as profit,
  CASE 
    WHEN SUM(s.total) > 0 
    THEN ((SUM(s.total) - SUM(si.quantity * COALESCE(p.cost, p.price * 0.6))) / SUM(s.total)) * 100
    ELSE 0
  END as profit_margin_percentage
FROM sales s
INNER JOIN sale_items si ON s.id = si.sale_id
INNER JOIN products p ON si.product_id = p.id
GROUP BY DATE_TRUNC('month', s.created_at)
ORDER BY month DESC;

-- ============================================
-- 10. RLS Policies for Views
-- ============================================
-- Views inherit RLS from underlying tables
-- No additional policies needed

-- ============================================
-- END OF REPORTS SCHEMA
-- ============================================