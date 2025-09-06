-- Fixed Database Setup for ZADA Water Delivery App
-- This file creates all necessary tables in the correct order

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in reverse order to handle dependencies)
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table first (no dependencies)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table (no dependencies)
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 10,
  category TEXT NOT NULL,
  supplier TEXT NOT NULL,
  image TEXT NOT NULL,
  description TEXT,
  features JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table (no dependencies)
CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table (depends on users)
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  delivery_address TEXT NOT NULL,
  delivery_zone TEXT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'out_for_delivery', 'delivered')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  estimated_delivery_time TEXT,
  order_capacity INTEGER,
  cluster_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table (depends on orders)
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('support', 'order')),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics table (no dependencies)
CREATE TABLE analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(15,2) NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('revenue', 'orders', 'customers', 'inventory')),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_orders_admin_id ON orders(admin_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_messages_order_id ON messages(order_id);
CREATE INDEX idx_analytics_metric_type ON analytics(metric_type);
CREATE INDEX idx_analytics_period ON analytics(period_start, period_end);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own data" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (true);

-- Create RLS policies for products table
CREATE POLICY "Everyone can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON products FOR ALL USING (true);

-- Create RLS policies for orders table
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Admins can manage orders" ON orders FOR ALL USING (true);

-- Create RLS policies for customers table
CREATE POLICY "Everyone can view customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Everyone can manage customers" ON customers FOR ALL USING (true);

-- Create RLS policies for messages table
CREATE POLICY "Everyone can view messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Everyone can insert messages" ON messages FOR INSERT WITH CHECK (true);

-- Create RLS policies for analytics table
CREATE POLICY "Admins can view analytics" ON analytics FOR SELECT USING (true);
CREATE POLICY "Admins can manage analytics" ON analytics FOR ALL USING (true);

-- Insert sample data
INSERT INTO users (id, name, email, role) VALUES 
('admin-1', 'Admin User', 'admin@zada.com', 'admin'),
('customer-1', 'John Doe', 'john@example.com', 'customer'),
('customer-2', 'Jane Smith', 'jane@example.com', 'customer');

INSERT INTO products (id, name, price, stock, min_stock, category, supplier, image, description, features) VALUES 
('1', 'ZADA Pure Water 50cl', 100.00, 500, 50, 'water', 'ZADA Equipment', '💧', 'Pure, clean drinking water', '["Pure", "Clean", "Safe"]'),
('2', 'ZADA Water Filter Cartridge', 2500.00, 25, 10, 'accessories', 'ZADA Equipment', '🔧', 'High-quality water filter', '["Durable", "Effective", "Long-lasting"]'),
('3', 'ZADA Water Dispenser', 15000.00, 15, 5, 'equipment', 'ZADA Equipment', '🚰', 'Professional water dispenser', '["Professional", "Stainless Steel", "Easy to Use"]');

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
