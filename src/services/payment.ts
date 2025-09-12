/**
 * Payment Service
 * Comprehensive payment processing with multiple providers
 */

import { db } from '../config/database';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_transfer' | 'mobile_money' | 'cash';
  provider: 'stripe' | 'paystack' | 'flutterwave' | 'cash';
  details: {
    last4?: string;
    brand?: string;
    expiry_month?: number;
    expiry_year?: number;
    bank_name?: string;
    account_number?: string;
    phone_number?: string;
  };
  is_default: boolean;
  created_at: string;
}

export interface PaymentIntent {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  payment_method: string;
  provider_transaction_id?: string;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentResult {
  success: boolean;
  transaction_id?: string;
  error?: string;
  requires_action?: boolean;
  action_url?: string;
}

class PaymentService {
  private static instance: PaymentService;
  
  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }
  
  // Process payment
  async processPayment(
    orderId: string,
    amount: number,
    paymentMethod: string,
    currency: string = 'NGN'
  ): Promise<PaymentResult> {
    try {
      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(orderId, amount, currency, paymentMethod);
      
      // Process based on payment method
      switch (paymentMethod) {
        case 'card':
          return await this.processCardPayment(paymentIntent);
        case 'bank_transfer':
          return await this.processBankTransfer(paymentIntent);
        case 'mobile_money':
          return await this.processMobileMoneyPayment(paymentIntent);
        case 'cash':
          return await this.processCashPayment(paymentIntent);
        default:
          throw new Error('Unsupported payment method');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }
  
  // Create payment intent
  private async createPaymentIntent(
    orderId: string,
    amount: number,
    currency: string,
    paymentMethod: string
  ): Promise<PaymentIntent> {
    const paymentIntentData = {
      order_id: orderId,
      amount: Math.round(amount * 100), // Convert to kobo/cents
      currency: currency.toUpperCase(),
      status: 'pending' as const,
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await db.supabase
      .from('payment_intents')
      .insert([paymentIntentData])
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create payment intent: ${error.message}`);
    
    return data;
  }
  
  // Process card payment (Stripe/Paystack)
  async processCardPayment(paymentIntent: PaymentIntent): Promise<PaymentResult> {
    try {
      // Simulate card payment processing
      // In production, integrate with actual payment provider
      const isSuccess = Math.random() > 0.1; // 90% success rate for demo
      
      if (isSuccess) {
        await this.updatePaymentStatus(paymentIntent.id, 'succeeded', 'stripe_pi_' + Date.now());
        
        return {
          success: true,
          transaction_id: 'stripe_pi_' + Date.now()
        };
      } else {
        await this.updatePaymentStatus(paymentIntent.id, 'failed', undefined, 'Card declined');
        
        return {
          success: false,
          error: 'Card payment failed. Please try again.'
        };
      }
    } catch (error) {
      await this.updatePaymentStatus(paymentIntent.id, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
  
  // Process bank transfer
  async processBankTransfer(paymentIntent: PaymentIntent): Promise<PaymentResult> {
    try {
      // Generate bank transfer details
      const transferDetails = {
        bank_name: 'ZADA Foods Bank Account',
        account_number: '1234567890',
        account_name: 'ZADA Foods Limited',
        amount: paymentIntent.amount / 100,
        reference: `ZADA-${paymentIntent.order_id}`,
        instructions: 'Please include the reference number in your transfer description'
      };
      
      await this.updatePaymentStatus(paymentIntent.id, 'pending');
      
      return {
        success: true,
        transaction_id: `bank_${paymentIntent.id}`,
        requires_action: true,
        action_url: `/payment/bank-transfer/${paymentIntent.id}`
      };
    } catch (error) {
      await this.updatePaymentStatus(paymentIntent.id, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
  
  // Process mobile money payment
  async processMobileMoneyPayment(paymentIntent: PaymentIntent): Promise<PaymentResult> {
    try {
      // Simulate mobile money processing
      const isSuccess = Math.random() > 0.05; // 95% success rate for demo
      
      if (isSuccess) {
        await this.updatePaymentStatus(paymentIntent.id, 'succeeded', 'mm_' + Date.now());
        
        return {
          success: true,
          transaction_id: 'mm_' + Date.now()
        };
      } else {
        await this.updatePaymentStatus(paymentIntent.id, 'failed', undefined, 'Mobile money payment failed');
        
        return {
          success: false,
          error: 'Mobile money payment failed. Please try again.'
        };
      }
    } catch (error) {
      await this.updatePaymentStatus(paymentIntent.id, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
  
  // Process cash payment
  async processCashPayment(paymentIntent: PaymentIntent): Promise<PaymentResult> {
    try {
      // Cash payments are always successful (pending confirmation)
      await this.updatePaymentStatus(paymentIntent.id, 'pending');
      
      return {
        success: true,
        transaction_id: `cash_${paymentIntent.id}`
      };
    } catch (error) {
      await this.updatePaymentStatus(paymentIntent.id, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
  
  // Update payment status
  private async updatePaymentStatus(
    paymentIntentId: string,
    status: PaymentIntent['status'],
    providerTransactionId?: string,
    failureReason?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (providerTransactionId) {
      updateData.provider_transaction_id = providerTransactionId;
    }
    
    if (failureReason) {
      updateData.failure_reason = failureReason;
    }
    
    const { error } = await db.supabase
      .from('payment_intents')
      .update(updateData)
      .eq('id', paymentIntentId);
    
    if (error) throw new Error(`Failed to update payment status: ${error.message}`);
  }
  
  // Get payment methods for user
  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await db.supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(`Failed to get payment methods: ${error.message}`);
      
      return data || [];
    } catch (error) {
      console.error('Error getting payment methods:', error);
      return [];
    }
  }
  
  // Add payment method
  async addPaymentMethod(
    userId: string,
    type: PaymentMethod['type'],
    provider: PaymentMethod['provider'],
    details: PaymentMethod['details'],
    isDefault: boolean = false
  ): Promise<PaymentMethod> {
    try {
      // If this is set as default, unset other defaults
      if (isDefault) {
        await db.supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', userId);
      }
      
      const paymentMethodData = {
        user_id: userId,
        type,
        provider,
        details,
        is_default: isDefault,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await db.supabase
        .from('payment_methods')
        .insert([paymentMethodData])
        .select()
        .single();
      
      if (error) throw new Error(`Failed to add payment method: ${error.message}`);
      
      return data;
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }
  
  // Remove payment method
  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      const { error } = await db.supabase
        .from('payment_methods')
        .delete()
        .eq('id', paymentMethodId);
      
      if (error) throw new Error(`Failed to remove payment method: ${error.message}`);
    } catch (error) {
      console.error('Error removing payment method:', error);
      throw error;
    }
  }
  
  // Refund payment
  async refundPayment(paymentIntentId: string, amount?: number): Promise<PaymentResult> {
    try {
      const { data: paymentIntent, error: fetchError } = await db.supabase
        .from('payment_intents')
        .select('*')
        .eq('id', paymentIntentId)
        .single();
      
      if (fetchError) throw new Error(`Failed to get payment intent: ${fetchError.message}`);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Can only refund successful payments');
      }
      
      // Simulate refund processing
      const refundAmount = amount || paymentIntent.amount;
      const isSuccess = Math.random() > 0.05; // 95% success rate for demo
      
      if (isSuccess) {
        await this.updatePaymentStatus(paymentIntentId, 'refunded');
        
        return {
          success: true,
          transaction_id: `refund_${Date.now()}`
        };
      } else {
        throw new Error('Refund processing failed');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed'
      };
    }
  }
  
  // Get payment history
  async getPaymentHistory(
    userId: string,
    filters?: {
      status?: string;
      date_from?: string;
      date_to?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<PaymentIntent[]> {
    try {
      let query = db.supabase
        .from('payment_intents')
        .select(`
          *,
          orders(order_number, total_amount)
        `)
        .eq('orders.customer_id', userId);
      
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
      
      if (error) throw new Error(`Failed to get payment history: ${error.message}`);
      
      return data || [];
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }
}

export const paymentService = PaymentService.getInstance();
