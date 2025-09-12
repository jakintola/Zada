/**
 * Simplified Database Service
 * Web-compatible database operations using localStorage
 */

import { storage } from '../../storageUtils';

export interface Product {
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
  categories?: { name: string };
  suppliers?: { name: string; contact_person: string };
}

export interface Order {
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
  shipping_address: any;
  billing_address: any;
  created_at: string;
  updated_at: string;
  shipped_at?: string;
  delivered_at?: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products?: Product;
}

class DatabaseService {
  private static instance: DatabaseService;
  
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
  
  // Initialize with sample data
  async initialize(): Promise<void> {
    try {
      // Check if products already exist
      const existingProducts = await storage.getItem('@zada_products');
      if (!existingProducts) {
        const sampleProducts: Product[] = [
          {
            id: 'prod_1',
            name: 'Premium Water 20L',
            description: 'Premium purified water in 20L container',
            price: 1200,
            cost: 800,
            sku: 'WAT-20L-001',
            category_id: 'cat_1',
            supplier_id: 'sup_1',
            stock_quantity: 50,
            min_stock_level: 10,
            max_stock_level: 100,
            images: ['https://example.com/water20l.jpg'],
            features: ['BPA Free', 'Purified', '20L Capacity'],
            specifications: { volume: '20L', material: 'BPA Free' },
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            categories: { name: 'Water Products' },
            suppliers: { name: 'AquaPure Nigeria', contact_person: 'John Smith' }
          },
          {
            id: 'prod_2',
            name: 'Water Dispenser',
            description: 'Electric water dispenser with hot and cold options',
            price: 25000,
            cost: 18000,
            sku: 'DISP-001',
            category_id: 'cat_2',
            supplier_id: 'sup_2',
            stock_quantity: 15,
            min_stock_level: 5,
            max_stock_level: 50,
            images: ['https://example.com/dispenser.jpg'],
            features: ['Hot & Cold', 'Energy Efficient', 'Easy to Clean'],
            specifications: { power: '100W', capacity: '5L' },
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            categories: { name: 'Dispensers' },
            suppliers: { name: 'CoolTech Solutions', contact_person: 'Jane Doe' }
          },
          {
            id: 'prod_3',
            name: 'Water Filter',
            description: 'Advanced water filtration system',
            price: 8500,
            cost: 6000,
            sku: 'FILT-001',
            category_id: 'cat_3',
            supplier_id: 'sup_3',
            stock_quantity: 30,
            min_stock_level: 8,
            max_stock_level: 100,
            images: ['https://example.com/filter.jpg'],
            features: ['Multi-stage Filtration', 'Long Lasting', 'Easy Installation'],
            specifications: { stages: 5, lifespan: '6 months' },
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            categories: { name: 'Accessories' },
            suppliers: { name: 'FilterPro Industries', contact_person: 'Mike Johnson' }
          }
        ];
        
        await storage.setItem('@zada_products', JSON.stringify(sampleProducts));
      }
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }
  
  // Get products
  async getProducts(filters?: {
    category_id?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    try {
      await this.initialize();
      
      const productsData = await storage.getItem('@zada_products');
      if (!productsData) return [];
      
      let products: Product[] = JSON.parse(productsData);
      
      // Apply filters
      if (filters?.category_id) {
        products = products.filter(p => p.category_id === filters.category_id);
      }
      
      if (filters?.status) {
        products = products.filter(p => p.status === filters.status);
      }
      
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        products = products.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply pagination
      if (filters?.offset) {
        products = products.slice(filters.offset);
      }
      
      if (filters?.limit) {
        products = products.slice(0, filters.limit);
      }
      
      return products;
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  }
  
  // Get orders
  async getOrders(filters?: {
    customer_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<Order[]> {
    try {
      const ordersData = await storage.getItem('@zada_orders');
      if (!ordersData) return [];
      
      let orders: Order[] = JSON.parse(ordersData);
      
      // Apply filters
      if (filters?.customer_id) {
        orders = orders.filter(o => o.customer_id === filters.customer_id);
      }
      
      if (filters?.status) {
        orders = orders.filter(o => o.status === filters.status);
      }
      
      if (filters?.date_from) {
        orders = orders.filter(o => o.created_at >= filters.date_from!);
      }
      
      if (filters?.date_to) {
        orders = orders.filter(o => o.created_at <= filters.date_to!);
      }
      
      // Sort by created_at desc
      orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Apply pagination
      if (filters?.offset) {
        orders = orders.slice(filters.offset);
      }
      
      if (filters?.limit) {
        orders = orders.slice(0, filters.limit);
      }
      
      return orders;
    } catch (error) {
      console.error('Error getting orders:', error);
      return [];
    }
  }
  
  // Create order
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    try {
      const order: Order = {
        id: 'ord_' + Date.now(),
        order_number: 'ZADA-' + Date.now(),
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'cash',
        subtotal: 0,
        tax_amount: 0,
        shipping_cost: 0,
        discount_amount: 0,
        total_amount: 0,
        shipping_address: {},
        billing_address: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...orderData
      } as Order;
      
      const ordersData = await storage.getItem('@zada_orders');
      const orders: Order[] = ordersData ? JSON.parse(ordersData) : [];
      orders.push(order);
      await storage.setItem('@zada_orders', JSON.stringify(orders));
      
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }
  
  // Update order status
  async updateOrderStatus(id: string, status: string, updates?: Partial<Order>): Promise<Order> {
    try {
      const ordersData = await storage.getItem('@zada_orders');
      if (!ordersData) throw new Error('No orders found');
      
      const orders: Order[] = JSON.parse(ordersData);
      const orderIndex = orders.findIndex(o => o.id === id);
      
      if (orderIndex === -1) throw new Error('Order not found');
      
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
      
      orders[orderIndex] = { ...orders[orderIndex], ...updateData };
      await storage.setItem('@zada_orders', JSON.stringify(orders));
      
      return orders[orderIndex];
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
  
  // Get analytics
  async getAnalytics(metric: string, dateFrom: string, dateTo: string): Promise<any[]> {
    try {
      const analyticsData = await storage.getItem('@zada_analytics');
      if (!analyticsData) return [];
      
      const analytics = JSON.parse(analyticsData);
      return analytics.filter((a: any) => 
        a.metric_name === metric &&
        a.date >= dateFrom &&
        a.date <= dateTo
      );
    } catch (error) {
      console.error('Error getting analytics:', error);
      return [];
    }
  }
  
  // Log audit event
  async logAuditEvent(event: {
    user_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    ip_address: string;
    user_agent: string;
  }): Promise<void> {
    try {
      const auditData = await storage.getItem('@zada_audit_logs');
      const auditLogs = auditData ? JSON.parse(auditData) : [];
      
      auditLogs.push({
        ...event,
        id: 'audit_' + Date.now(),
        created_at: new Date().toISOString()
      });
      
      await storage.setItem('@zada_audit_logs', JSON.stringify(auditLogs));
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }
}

export const db = DatabaseService.getInstance();
