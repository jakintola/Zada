-- Simple ZADA Database Setup
-- Run this in your Supabase SQL Editor

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  delivery_address TEXT NOT NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cash',
  delivery_zone TEXT,
  priority TEXT DEFAULT 'normal',
  notes TEXT,
  estimated_delivery TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable Row Level Security (but allow all for dev)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Create permissive policies for development
CREATE POLICY "Allow all customers operations" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all orders operations" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers (email);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at);

-- 6. Insert sample data for testing
INSERT INTO public.customers (email, name, phone, address) VALUES 
('john@example.com', 'John Doe', '+1234567890', '123 Main St, Lagos, Nigeria'),
('jane@example.com', 'Jane Smith', '+0987654321', '456 Oak Ave, Abuja, Nigeria')
ON CONFLICT (email) DO NOTHING;

-- Success message
SELECT 'Database setup completed successfully!' as message;
