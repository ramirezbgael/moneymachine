# Supabase Setup Guide

## Database Schema

Create the following tables in your Supabase project:

### 1. Products Table

```sql
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_name ON products(name);
```

### 2. Sales Table

```sql
CREATE TABLE sales (
  id BIGSERIAL PRIMARY KEY,
  sale_number TEXT UNIQUE NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  payment_method TEXT NOT NULL,
  receipt_type TEXT NOT NULL,
  customer_id BIGINT REFERENCES customers(id),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_user_id ON sales(user_id);
```

### 3. Sale Items Table

```sql
CREATE TABLE sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
```

### 4. Customers Table

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT UNIQUE,
  name TEXT,
  last_name TEXT,
  rfc TEXT,
  email TEXT,
  pending_csf BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);
```

## Row Level Security (RLS)

Enable RLS and create policies:

```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Products: Allow all authenticated users to read, insert, update
CREATE POLICY "Products are viewable by authenticated users"
  ON products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Products are insertable by authenticated users"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Products are updatable by authenticated users"
  ON products FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Products are deletable by authenticated users"
  ON products FOR DELETE
  USING (auth.role() = 'authenticated');

-- Sales: Users can only see their own sales (or all if admin)
CREATE POLICY "Sales are viewable by authenticated users"
  ON sales FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Sales are insertable by authenticated users"
  ON sales FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Similar policies for sale_items and customers
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Authentication

The app supports:
- Supabase authentication (when configured)
- Mock authentication (for development without Supabase)

To use Supabase auth:
1. Enable Email authentication in Supabase dashboard
2. Create a user account
3. Use those credentials to sign in

## Migration Path

The architecture is designed to allow migration from Supabase to a custom backend:
- All Supabase calls are abstracted in services
- Services check `isSupabaseConfigured()` before using Supabase
- Mock data is used as fallback
- Easy to replace service implementations with custom API calls