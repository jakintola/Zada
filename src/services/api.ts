/**
 * API service for handling all external API calls
 * Centralized API operations with proper error handling and retry logic
 */

import { supabase } from '../../supabaseClient';
import { retry, handleError } from '../utils';
import { ApiResponse } from '../types';

class ApiService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    this.timeout = 10000;
  }

  /**
   * Generic method to handle API calls with retry logic
   */
  private async makeRequest<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<ApiResponse<T>> {
    try {
      const data = await retry(operation, 3, 1000);
      return { data, success: true };
    } catch (error) {
      console.error(`${operationName} failed:`, error);
      return {
        success: false,
        error: handleError(error, `${operationName} failed`),
      };
    }
  }

  /**
   * Users API
   */
  async getUsers(): Promise<ApiResponse<any[]>> {
    return this.makeRequest(
      async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      },
      'Get users'
    );
  }

  async createUser(userData: any): Promise<ApiResponse<any>> {
    return this.makeRequest(
      async () => {
        const { data, error } = await supabase
          .from('users')
          .insert([userData])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },
      'Create user'
    );
  }

  async updateUser(userId: string, updates: any): Promise<ApiResponse<any>> {
    return this.makeRequest(
      async () => {
        const { data, error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', userId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },
      'Update user'
    );
  }

  /**
   * Products API
   */
  async getProducts(): Promise<ApiResponse<any[]>> {
    return this.makeRequest(
      async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      },
      'Get products'
    );
  }

  async createProduct(productData: any): Promise<ApiResponse<any>> {
    return this.makeRequest(
      async () => {
        const { data, error } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },
      'Create product'
    );
  }

  async updateProduct(productId: string, updates: any): Promise<ApiResponse<any>> {
    return this.makeRequest(
      async () => {
        const { data, error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', productId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },
      'Update product'
    );
  }

  async deleteProduct(productId: string): Promise<ApiResponse<void>> {
    return this.makeRequest(
      async () => {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);
        
        if (error) throw error;
      },
      'Delete product'
    );
  }

  async bulkUpdateProducts(products: any[]): Promise<ApiResponse<void>> {
    return this.makeRequest(
      async () => {
        // Delete existing products
        await supabase.from('products').delete().neq('id', '');
        
        // Insert new products
        const { error } = await supabase
          .from('products')
          .insert(products);
        
        if (error) throw error;
      },
      'Bulk update products'
    );
  }

  /**
   * Orders API
   */
  async getOrders(adminId?: string, customerId?: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(
      async () => {
        let query = supabase.from('orders').select('*');
        
        if (adminId) {
          query = query.eq('admin_id', adminId);
        }
        if (customerId) {
          query = query.eq('customer_id', customerId);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      },
      'Get orders'
    );
  }

  async createOrder(orderData: any): Promise<ApiResponse<any>> {
    return this.makeRequest(
      async () => {
        const { data, error } = await supabase
          .from('orders')
          .insert([orderData])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },
      'Create order'
    );
  }

  async updateOrder(orderId: string, updates: any): Promise<ApiResponse<any>> {
    return this.makeRequest(
      async () => {
        const { data, error } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', orderId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },
      'Update order'
    );
  }

  async deleteOrder(orderId: string): Promise<ApiResponse<void>> {
    return this.makeRequest(
      async () => {
        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', orderId);
        
        if (error) throw error;
      },
      'Delete order'
    );
  }

  async bulkUpdateOrders(orders: any[]): Promise<ApiResponse<void>> {
    return this.makeRequest(
      async () => {
        if (orders.length > 0) {
          // Delete existing orders for this admin
          await supabase
            .from('orders')
            .delete()
            .eq('admin_id', orders[0].admin_id);

          // Insert new orders
          const { error } = await supabase
            .from('orders')
            .insert(orders);
          
          if (error) throw error;
        }
      },
      'Bulk update orders'
    );
  }

  /**
   * Messages API
   */
  async getMessages(type?: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(
      async () => {
        let query = supabase.from('messages').select('*');
        
        if (type) {
          query = query.eq('type', type);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      },
      'Get messages'
    );
  }

  async createMessage(messageData: any): Promise<ApiResponse<any>> {
    return this.makeRequest(
      async () => {
        const { data, error } = await supabase
          .from('messages')
          .insert([messageData])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },
      'Create message'
    );
  }

  /**
   * Analytics API
   */
  async getAnalytics(): Promise<ApiResponse<any[]>> {
    return this.makeRequest(
      async () => {
        const { data, error } = await supabase
          .from('analytics')
          .select('*')
          .order('last_updated', { ascending: false });
        
        if (error) throw error;
        return data || [];
      },
      'Get analytics'
    );
  }

  async updateAnalytics(analyticsData: any[]): Promise<ApiResponse<void>> {
    return this.makeRequest(
      async () => {
        // Delete existing analytics
        await supabase.from('analytics').delete().neq('id', '');
        
        // Insert new analytics
        const { error } = await supabase
          .from('analytics')
          .insert(analyticsData);
        
        if (error) throw error;
      },
      'Update analytics'
    );
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<ApiResponse<boolean>> {
    return this.makeRequest(
      async () => {
        const { error } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        
        if (error) throw error;
        return true;
      },
      'Health check'
    );
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
