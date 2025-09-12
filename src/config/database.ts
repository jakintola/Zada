/**
 * Database Configuration and Schema
 * Production-ready database setup with proper relationships
 */

import { supabase } from '../../supabaseClient';

export interface DatabaseSchema {
  users: {
    id: string;
    email: string;
    password_hash: string;
    role: 'customer' | 'admin' | 'super_admin';
    profile: {
      first_name: string;
      last_name: string;
      phone?: string;
      address?: string;
      avatar_url?: string;
    };
    preferences: {
      notifications: boolean;
      marketing: boolean;
      theme: 'light' | 'dark';
    };
    status: 'active' | 'inactive' | 'suspended';
    created_at: string;
    updated_at: string;
    last_login_at?: string;
  };
  
  products: {
    id: string;
    name: string;
    description: string;
    price: number;
    cost: number;
    sku: string;
    category_id: string;
    supplier_id: string;
    stock_quantity: number;
    min_stock_level: number;
    max_stock_level: number;
    images: string[];
    features: string[];
    specifications: Record<string, any>;
    status: 'active' | 'inactive' | 'discontinued';
    created_at: string;
    updated_at: string;
  };
  
  categories: {
    id: string;
    name: string;
    description: string;
    parent_id?: string;
    image_url?: string;
    sort_order: number;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
  };
  
  suppliers: {
    id: string;
    name: string;
    contact_person: string;
    email: string;
    phone: string;
    address: string;
    payment_terms: string;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
  };
  
  orders: {
    id: string;
    customer_id: string;
    order_number: string;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    payment_method: 'cash' | 'card' | 'bank_transfer' | 'mobile_money';
    subtotal: number;
    tax_amount: number;
    shipping_cost: number;
    discount_amount: number;
    total_amount: number;
    notes?: string;
    shipping_address: {
      street: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
    billing_address: {
      street: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
    created_at: string;
    updated_at: string;
    shipped_at?: string;
    delivered_at?: string;
  };
  
  order_items: {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    created_at: string;
  };
  
  cart_items: {
    id: string;
    user_id: string;
    product_id: string;
    quantity: number;
    created_at: string;
    updated_at: string;
  };
  
  messages: {
    id: string;
    sender_id: string;
    recipient_id?: string;
    type: 'support' | 'order' | 'general';
    subject: string;
    content: string;
    status: 'unread' | 'read' | 'archived';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string;
    updated_at: string;
  };
  
  notifications: {
    id: string;
    user_id: string;
    type: 'order' | 'message' | 'system' | 'promotion';
    title: string;
    content: string;
    data: Record<string, any>;
    status: 'unread' | 'read' | 'dismissed';
    created_at: string;
    read_at?: string;
  };
  
  analytics: {
    id: string;
    metric_name: string;
    metric_value: number;
    dimensions: Record<string, any>;
    date: string;
    created_at: string;
  };
  
  audit_logs: {
    id: string;
    user_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    old_values: Record<string, any>;
    new_values: Record<string, any>;
    ip_address: string;
    user_agent: string;
    created_at: string;
  };
}

export class DatabaseService {
  private static instance: DatabaseService;
  
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
  
  // User Management
  async createUser(userData: Partial<DatabaseSchema['users']>) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return data;
  }
  
  async getUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(`Failed to get user: ${error.message}`);
    return data;
  }
  
  async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) throw new Error(`Failed to get user: ${error.message}`);
    return data;
  }
  
  async updateUser(id: string, updates: Partial<DatabaseSchema['users']>) {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update user: ${error.message}`);
    return data;
  }
  
  // Product Management
  async getProducts(filters?: {
    category_id?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('products')
      .select(`
        *,
        categories(name),
        suppliers(name, contact_person)
      `);
    
    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Failed to get products: ${error.message}`);
    return data;
  }
  
  async createProduct(productData: Partial<DatabaseSchema['products']>) {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create product: ${error.message}`);
    return data;
  }
  
  async updateProduct(id: string, updates: Partial<DatabaseSchema['products']>) {
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update product: ${error.message}`);
    return data;
  }
  
  // Order Management
  async createOrder(orderData: Partial<DatabaseSchema['orders']>) {
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create order: ${error.message}`);
    return data;
  }
  
  async getOrders(filters?: {
    customer_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          products(name, images)
        )
      `);
    
    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to get orders: ${error.message}`);
    return data;
  }
  
  async updateOrderStatus(id: string, status: string, updates?: Partial<DatabaseSchema['orders']>) {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...updates
    };
    
    if (status === 'shipped') {
      updateData.shipped_at = new Date().toISOString();
    }
    
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update order: ${error.message}`);
    return data;
  }
  
  // Analytics
  async getAnalytics(metric: string, dateFrom: string, dateTo: string) {
    const { data, error } = await supabase
      .from('analytics')
      .select('*')
      .eq('metric_name', metric)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: true });
    
    if (error) throw new Error(`Failed to get analytics: ${error.message}`);
    return data;
  }
  
  // Audit Logging
  async logAuditEvent(event: {
    user_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    ip_address: string;
    user_agent: string;
  }) {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        ...event,
        created_at: new Date().toISOString()
      }]);
    
    if (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}

export const db = DatabaseService.getInstance();
