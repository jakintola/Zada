import { supabase } from '../../supabaseClient';
import { storage } from '../../storageUtils';

export interface DatabaseUser {
  id: string;
  email: string;
  role: 'customer' | 'admin';
  profile: {
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface DatabaseProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  stock_quantity: number;
  min_stock_level: number;
  max_stock_level: number;
  status: 'active' | 'inactive';
  category_id: string;
  supplier_id: string;
  features: string[];
  images: string[];
  specifications: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DatabaseOrder {
  id: string;
  customer_id: string;
  admin_id?: string;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'cash' | 'card' | 'bank_transfer';
  delivery_status: 'pending' | 'preparing' | 'out_for_delivery' | 'delivered';
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  shipping_address: string;
  notes?: string;
  order_items: Array<{
    product_id: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  created_at: string;
  updated_at: string;
}

class DatabaseService {
  private isConnected: boolean = false;
  private connectionChecked: boolean = false;

  async checkConnection(): Promise<boolean> {
    if (this.connectionChecked) {
      return this.isConnected;
    }

    try {
      console.log('🔍 Checking database connection...');
      
      // Test Supabase connection
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        console.warn('⚠️ Supabase connection failed:', error.message);
        this.isConnected = false;
      } else {
        console.log('✅ Supabase connection successful');
        this.isConnected = true;
      }
    } catch (error) {
      console.warn('⚠️ Database connection error:', error);
      this.isConnected = false;
    }

    this.connectionChecked = true;
    return this.isConnected;
  }

  // User Management
  async createUser(user: Omit<DatabaseUser, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseUser> {
    const isConnected = await this.checkConnection();
    
    if (isConnected) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert([{
            email: user.email,
            role: user.role,
            profile: user.profile,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('❌ Error creating user in database:', error);
        throw error;
      }
    } else {
      // Fallback to local storage
      return this.createUserLocal(user);
    }
  }

  async getUserByEmail(email: string): Promise<DatabaseUser | null> {
    const isConnected = await this.checkConnection();
    
    if (isConnected) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return null; // User not found
          }
          throw error;
        }
        return data;
      } catch (error) {
        console.error('❌ Error fetching user from database:', error);
        return null;
      }
    } else {
      // Fallback to local storage
      return this.getUserByEmailLocal(email);
    }
  }

  async getAllUsers(): Promise<DatabaseUser[]> {
    const isConnected = await this.checkConnection();
    
    if (isConnected) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('❌ Error fetching users from database:', error);
        return [];
      }
    } else {
      // Fallback to local storage
      return this.getAllUsersLocal();
    }
  }

  // Local Storage Fallbacks
  private async createUserLocal(user: Omit<DatabaseUser, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseUser> {
    const newUser: DatabaseUser = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      ...user,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const existingUsers = await this.getAllUsersLocal();
    const updatedUsers = [...existingUsers, newUser];
    await storage.setItem('@zada_users', JSON.stringify(updatedUsers));
    
    console.log('💾 User created in local storage:', newUser.email);
    return newUser;
  }

  private async getUserByEmailLocal(email: string): Promise<DatabaseUser | null> {
    const users = await this.getAllUsersLocal();
    return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
  }

  private async getAllUsersLocal(): Promise<DatabaseUser[]> {
    try {
      const usersData = await storage.getItem('@zada_users');
      return usersData ? JSON.parse(usersData) : [];
    } catch (error) {
      console.error('❌ Error loading users from local storage:', error);
      return [];
    }
  }

  // Product Management
  async createProduct(product: Omit<DatabaseProduct, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseProduct> {
    const isConnected = await this.checkConnection();
    
    if (isConnected) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert([{
            ...product,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('❌ Error creating product in database:', error);
        throw error;
      }
    } else {
      return this.createProductLocal(product);
    }
  }

  async getAllProducts(): Promise<DatabaseProduct[]> {
    const isConnected = await this.checkConnection();
    
    if (isConnected) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('❌ Error fetching products from database:', error);
        return [];
      }
    } else {
      return this.getAllProductsLocal();
    }
  }

  private async createProductLocal(product: Omit<DatabaseProduct, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseProduct> {
    const newProduct: DatabaseProduct = {
      id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      ...product,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const existingProducts = await this.getAllProductsLocal();
    const updatedProducts = [...existingProducts, newProduct];
    await storage.setItem('@zada_products', JSON.stringify(updatedProducts));
    
    console.log('💾 Product created in local storage:', newProduct.name);
    return newProduct;
  }

  private async getAllProductsLocal(): Promise<DatabaseProduct[]> {
    try {
      const productsData = await storage.getItem('@zada_products');
      return productsData ? JSON.parse(productsData) : [];
    } catch (error) {
      console.error('❌ Error loading products from local storage:', error);
      return [];
    }
  }

  // Order Management
  async createOrder(order: Omit<DatabaseOrder, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseOrder> {
    const isConnected = await this.checkConnection();
    
    if (isConnected) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .insert([{
            ...order,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('❌ Error creating order in database:', error);
        throw error;
      }
    } else {
      return this.createOrderLocal(order);
    }
  }

  async getAllOrders(): Promise<DatabaseOrder[]> {
    const isConnected = await this.checkConnection();
    
    if (isConnected) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('❌ Error fetching orders from database:', error);
        return [];
      }
    } else {
      return this.getAllOrdersLocal();
    }
  }

  private async createOrderLocal(order: Omit<DatabaseOrder, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseOrder> {
    const newOrder: DatabaseOrder = {
      id: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      ...order,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const existingOrders = await this.getAllOrdersLocal();
    const updatedOrders = [...existingOrders, newOrder];
    await storage.setItem('@zada_orders', JSON.stringify(updatedOrders));
    
    console.log('💾 Order created in local storage:', newOrder.order_number);
    return newOrder;
  }

  private async getAllOrdersLocal(): Promise<DatabaseOrder[]> {
    try {
      const ordersData = await storage.getItem('@zada_orders');
      return ordersData ? JSON.parse(ordersData) : [];
    } catch (error) {
      console.error('❌ Error loading orders from local storage:', error);
      return [];
    }
  }

  // Clear all data (for testing)
  async clearAllData(): Promise<void> {
    try {
      console.log('🗑️ Clearing all data...');
      await storage.removeItem('@zada_users');
      await storage.removeItem('@zada_products');
      await storage.removeItem('@zada_orders');
      await storage.removeItem('@zada_customers');
      console.log('✅ All data cleared');
    } catch (error) {
      console.error('❌ Error clearing data:', error);
    }
  }

  // Initialize sample data
  async initializeSampleData(): Promise<void> {
    console.log('🚀 Initializing sample data...');
    
    // Check if data already exists
    const existingUsers = await this.getAllUsers();
    console.log('📊 Existing users found:', existingUsers.length);
    console.log('📊 Existing users:', existingUsers.map(u => ({ email: u.email, role: u.role })));
    
    if (existingUsers.length > 0) {
      console.log('📊 Sample data already exists, skipping initialization');
      return;
    }

    // Create sample admin user
    const adminUser = await this.createUser({
      email: 'admin@zadafoods.com',
      role: 'admin',
      profile: {
        first_name: 'Admin',
        last_name: 'User',
        phone: '+2348012345680',
        address: 'ZADA Foods Headquarters'
      }
    });

    // Create sample customer users
    await this.createUser({
      email: 'john.doe@example.com',
      role: 'customer',
      profile: {
        first_name: 'John',
        last_name: 'Doe',
        phone: '+2348012345678',
        address: '123 Main Street, Lagos'
      }
    });

    await this.createUser({
      email: 'jane.smith@example.com',
      role: 'customer',
      profile: {
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '+2348012345679',
        address: '456 Oak Avenue, Abuja'
      }
    });

    console.log('✅ Sample data initialized successfully');
    console.log('👤 Admin user created:', adminUser.email);
  }
}

export const databaseService = new DatabaseService();
