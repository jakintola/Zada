-- ZADA Water Delivery - Production Database Schema
-- Comprehensive enterprise-grade database design

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'super_admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method_type AS ENUM ('card', 'bank_transfer', 'mobile_money', 'cash');
CREATE TYPE notification_type AS ENUM ('order', 'message', 'system', 'promotion');
CREATE TYPE notification_status AS ENUM ('unread', 'read', 'dismissed');
CREATE TYPE message_type AS ENUM ('support', 'order', 'general');
CREATE TYPE message_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT 'user_' || substr(md5(random()::text), 1, 12),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    profile JSONB NOT NULL DEFAULT '{
        "first_name": "",
        "last_name": "",
        "phone": null,
        "address": null,
        "avatar_url": null
    }',
    preferences JSONB NOT NULL DEFAULT '{
        "notifications": true,
        "marketing": false,
        "theme": "light"
    }',
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Categories table
CREATE TABLE categories (
    id TEXT PRIMARY KEY DEFAULT 'cat_' || substr(md5(random()::text), 1, 12),
    name TEXT NOT NULL,
    description TEXT,
    parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY DEFAULT 'sup_' || substr(md5(random()::text), 1, 12),
    name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    payment_terms TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id TEXT PRIMARY KEY DEFAULT 'prod_' || substr(md5(random()::text), 1, 12),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    cost DECIMAL(10,2) NOT NULL CHECK (cost >= 0),
    sku TEXT UNIQUE NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_level INTEGER NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
    max_stock_level INTEGER NOT NULL DEFAULT 0 CHECK (max_stock_level >= 0),
    images TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    specifications JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    id TEXT PRIMARY KEY DEFAULT 'ord_' || substr(md5(random()::text), 1, 12),
    customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    order_number TEXT UNIQUE NOT NULL DEFAULT 'ZADA-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6),
    status order_status NOT NULL DEFAULT 'pending',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_method payment_method_type,
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    notes TEXT,
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Order items table
CREATE TABLE order_items (
    id TEXT PRIMARY KEY DEFAULT 'item_' || substr(md5(random()::text), 1, 12),
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cart items table
CREATE TABLE cart_items (
    id TEXT PRIMARY KEY DEFAULT 'cart_' || substr(md5(random()::text), 1, 12),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Payment methods table
CREATE TABLE payment_methods (
    id TEXT PRIMARY KEY DEFAULT 'pm_' || substr(md5(random()::text), 1, 12),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type payment_method_type NOT NULL,
    provider TEXT NOT NULL,
    details JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment intents table
CREATE TABLE payment_intents (
    id TEXT PRIMARY KEY DEFAULT 'pi_' || substr(md5(random()::text), 1, 12),
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0), -- Amount in kobo/cents
    currency TEXT NOT NULL DEFAULT 'NGN',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded')),
    payment_method TEXT NOT NULL,
    provider_transaction_id TEXT,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id TEXT PRIMARY KEY DEFAULT 'msg_' || substr(md5(random()::text), 1, 12),
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    type message_type NOT NULL DEFAULT 'general',
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    priority message_priority NOT NULL DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id TEXT PRIMARY KEY DEFAULT 'notif_' || substr(md5(random()::text), 1, 12),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    status notification_status NOT NULL DEFAULT 'unread',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Analytics table
CREATE TABLE analytics (
    id TEXT PRIMARY KEY DEFAULT 'analytics_' || substr(md5(random()::text), 1, 12),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    dimensions JSONB DEFAULT '{}',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY DEFAULT 'audit_' || substr(md5(random()::text), 1, 12),
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_payment_intents_order ON payment_intents(order_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_analytics_metric ON analytics(metric_name);
CREATE INDEX idx_analytics_date ON analytics(date);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON payment_intents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (id = auth.uid()::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (id = auth.uid()::text);

-- Orders policies
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (customer_id = auth.uid()::text);
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'super_admin'))
);

-- Order items policies
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_items.order_id AND customer_id = auth.uid()::text)
);
CREATE POLICY "Admins can view all order items" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'super_admin'))
);

-- Cart items policies
CREATE POLICY "Users can manage own cart" ON cart_items FOR ALL USING (user_id = auth.uid()::text);

-- Payment methods policies
CREATE POLICY "Users can manage own payment methods" ON payment_methods FOR ALL USING (user_id = auth.uid()::text);

-- Payment intents policies
CREATE POLICY "Users can view own payment intents" ON payment_intents FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = payment_intents.order_id AND customer_id = auth.uid()::text)
);
CREATE POLICY "Admins can view all payment intents" ON payment_intents FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'super_admin'))
);

-- Messages policies
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (
    sender_id = auth.uid()::text OR recipient_id = auth.uid()::text
);
CREATE POLICY "Users can create messages" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid()::text);
CREATE POLICY "Admins can view all messages" ON messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'super_admin'))
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid()::text);

-- Insert sample data
INSERT INTO categories (name, description, sort_order) VALUES
('Water Products', 'Various types of water products', 1),
('Dispensers', 'Water dispensers and coolers', 2),
('Accessories', 'Water-related accessories and filters', 3);

INSERT INTO suppliers (name, contact_person, email, phone, address, payment_terms) VALUES
('AquaPure Nigeria', 'John Smith', 'contact@aquapure.ng', '+2348012345678', 'Lagos, Nigeria', 'Net 30'),
('CoolTech Solutions', 'Jane Doe', 'info@cooltech.ng', '+2348098765432', 'Abuja, Nigeria', 'Net 15'),
('FilterPro Industries', 'Mike Johnson', 'sales@filterpro.ng', '+2348055566677', 'Port Harcourt, Nigeria', 'Net 45');

INSERT INTO products (name, description, price, cost, sku, category_id, supplier_id, stock_quantity, min_stock_level, max_stock_level, images, features) VALUES
('Premium Water 20L', 'Premium purified water in 20L container', 1200.00, 800.00, 'WAT-20L-001', 
 (SELECT id FROM categories WHERE name = 'Water Products'), 
 (SELECT id FROM suppliers WHERE name = 'AquaPure Nigeria'), 
 50, 10, 100, 
 ARRAY['https://example.com/water20l.jpg'], 
 ARRAY['BPA Free', 'Purified', '20L Capacity']),
 
('Water Dispenser', 'Electric water dispenser with hot and cold options', 25000.00, 18000.00, 'DISP-001', 
 (SELECT id FROM categories WHERE name = 'Dispensers'), 
 (SELECT id FROM suppliers WHERE name = 'CoolTech Solutions'), 
 15, 5, 50, 
 ARRAY['https://example.com/dispenser.jpg'], 
 ARRAY['Hot & Cold', 'Energy Efficient', 'Easy to Clean']),
 
('Water Filter', 'Advanced water filtration system', 8500.00, 6000.00, 'FILT-001', 
 (SELECT id FROM categories WHERE name = 'Accessories'), 
 (SELECT id FROM suppliers WHERE name = 'FilterPro Industries'), 
 30, 8, 100, 
 ARRAY['https://example.com/filter.jpg'], 
 ARRAY['Multi-stage Filtration', 'Long Lasting', 'Easy Installation']);

-- Create a super admin user
INSERT INTO users (email, password_hash, role, profile, status) VALUES
('admin@zadafoods.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzK8K2', 'super_admin', 
 '{"first_name": "Super", "last_name": "Admin", "phone": "+2348000000000", "address": "ZADA Foods HQ"}', 
 'active');

-- Create functions for common operations
CREATE OR REPLACE FUNCTION get_user_orders(user_id TEXT, limit_count INTEGER DEFAULT 10, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
    order_id TEXT,
    order_number TEXT,
    status TEXT,
    total_amount DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE,
    item_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_number,
        o.status::TEXT,
        o.total_amount,
        o.created_at,
        COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.customer_id = user_id
    GROUP BY o.id, o.order_number, o.status, o.total_amount, o.created_at
    ORDER BY o.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_order_details(order_id TEXT)
RETURNS TABLE (
    order_id TEXT,
    order_number TEXT,
    status TEXT,
    total_amount DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE,
    customer_name TEXT,
    items JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_number,
        o.status::TEXT,
        o.total_amount,
        o.created_at,
        CONCAT(u.profile->>'first_name', ' ', u.profile->>'last_name') as customer_name,
        COALESCE(
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'product_id', oi.product_id,
                    'product_name', p.name,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'total_price', oi.total_price
                )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::JSON
        ) as items
    FROM orders o
    JOIN users u ON o.customer_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.id = order_id
    GROUP BY o.id, o.order_number, o.status, o.total_amount, o.created_at, u.profile;
END;
$$ LANGUAGE plpgsql;

-- Create view for analytics
CREATE VIEW order_analytics AS
SELECT 
    DATE(created_at) as order_date,
    COUNT(*) as total_orders,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as average_order_value,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
FROM orders
GROUP BY DATE(created_at)
ORDER BY order_date DESC;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
