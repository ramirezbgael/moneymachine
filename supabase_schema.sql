-- ============================================
-- POS System - Supabase Database Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  supplier TEXT,
  minimum_stock INTEGER DEFAULT 10,
  last_sale_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ============================================
-- 2. CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT UNIQUE,
  name TEXT,
  last_name TEXT,
  rfc TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  pending_csf BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_rfc ON customers(rfc);

-- ============================================
-- 3. SALES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  sale_number TEXT UNIQUE NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  receipt_type TEXT NOT NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for sales
CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);

-- ============================================
-- 4. SALE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for sale_items
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_created_at ON sale_items(created_at);

-- ============================================
-- 5. UPDATE TIMESTAMP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. UPDATE PRODUCT LAST_SALE_DATE FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_product_last_sale_date()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET last_sale_date = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_last_sale_date_trigger
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_last_sale_date();

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PRODUCTS POLICIES
-- ============================================
-- Allow authenticated users to view all products
CREATE POLICY "Products are viewable by authenticated users"
  ON products FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert products
CREATE POLICY "Products are insertable by authenticated users"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update products
CREATE POLICY "Products are updatable by authenticated users"
  ON products FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete products
CREATE POLICY "Products are deletable by authenticated users"
  ON products FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- CUSTOMERS POLICIES
-- ============================================
-- Allow authenticated users to view all customers
CREATE POLICY "Customers are viewable by authenticated users"
  ON customers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert customers
CREATE POLICY "Customers are insertable by authenticated users"
  ON customers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update customers
CREATE POLICY "Customers are updatable by authenticated users"
  ON customers FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete customers
CREATE POLICY "Customers are deletable by authenticated users"
  ON customers FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- SALES POLICIES
-- ============================================
-- Allow authenticated users to view all sales
CREATE POLICY "Sales are viewable by authenticated users"
  ON sales FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert sales
CREATE POLICY "Sales are insertable by authenticated users"
  ON sales FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update their own sales (optional)
CREATE POLICY "Sales are updatable by authenticated users"
  ON sales FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Prevent deletion of sales (optional - uncomment if needed)
-- CREATE POLICY "Sales are not deletable"
--   ON sales FOR DELETE
--   USING (false);

-- ============================================
-- SALE ITEMS POLICIES
-- ============================================
-- Allow authenticated users to view all sale items
CREATE POLICY "Sale items are viewable by authenticated users"
  ON sale_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert sale items
CREATE POLICY "Sale items are insertable by authenticated users"
  ON sale_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update sale items
CREATE POLICY "Sale items are updatable by authenticated users"
  ON sale_items FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete sale items
CREATE POLICY "Sale items are deletable by authenticated users"
  ON sale_items FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- 8. SAMPLE DATA (OPTIONAL)
-- ============================================
-- Uncomment to insert sample products for testing

/*
INSERT INTO products (code, barcode, name, description, price, stock) VALUES
('COKE001', '7501234567890', 'Coca Cola 500ml', 'Refresco de cola', 15.00, 50),
('CHIPS001', '7501234567891', 'Sabritas Original 100g', 'Papas fritas', 18.00, 30),
('CANDY001', '7501234567892', 'Chicles Bubbaloo', 'Chicle de sabores', 3.00, 100),
('WATER001', '7501234567893', 'Agua Ciel 1L', 'Agua purificada', 12.00, 80),
('JUICE001', '7501234567894', 'Jugo Del Valle 500ml', 'Jugo de manzana', 14.00, 25),
('BREAD001', '7501234567895', 'Pan Bimbo', 'Pan de caja', 35.00, 15),
('MILK001', '7501234567896', 'Leche Lala 1L', 'Leche entera', 28.00, 20),
('TIME001', 'TIME001', 'Internet 1 hora', 'Tiempo de computadora', 20.00, 999),
('PRINT001', 'PRINT001', 'Impresión B/N', 'Impresión blanco y negro', 2.00, 999),
('PHOTO001', 'PHOTO001', 'Fotos 4x6', 'Fotos tamaño postal', 5.00, 999);
*/

-- ============================================
-- 9. HELPER VIEWS (OPTIONAL)
-- ============================================

-- View for low stock products
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
  id,
  code,
  name,
  stock,
  minimum_stock,
  (minimum_stock - stock) as stock_deficit
FROM products
WHERE stock <= minimum_stock AND stock > 0
ORDER BY stock ASC;

-- View for sales summary
CREATE OR REPLACE VIEW sales_summary AS
SELECT 
  DATE(created_at) as sale_date,
  COUNT(*) as total_sales,
  SUM(total) as total_revenue,
  SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_revenue,
  SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card_revenue,
  SUM(CASE WHEN payment_method = 'transfer' THEN total ELSE 0 END) as transfer_revenue
FROM sales
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- ============================================
-- END OF SCHEMA
-- ============================================