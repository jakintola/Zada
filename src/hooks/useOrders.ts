/**
 * Orders management hook
 * Centralized order state and operations with proper error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { AdminOrder, CustomerOrder, OrderItem } from '../types';
import { showError, showSuccess, calculateOrderTotal } from '../utils';
import { storage } from '../../storageUtils';
import { supabase } from '../../supabaseClient';

interface UseOrdersReturn {
  adminOrders: AdminOrder[];
  customerOrders: CustomerOrder[];
  isLoading: boolean;
  loadAdminOrders: (adminId: string) => Promise<void>;
  loadCustomerOrders: (customerId: string) => Promise<void>;
  saveAdminOrders: (orders: AdminOrder[]) => Promise<void>;
  addAdminOrder: (order: Omit<AdminOrder, 'id'>) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: string, adminId: string) => Promise<boolean>;
  createCustomerOrder: (orderData: {
    customerId: string;
    items: OrderItem[];
    notes?: string;
    deliveryAddress: string;
    deliveryZone: string;
  }) => Promise<boolean>;
  getOrderById: (id: string) => AdminOrder | CustomerOrder | undefined;
  getOrdersByStatus: (status: string) => AdminOrder[];
  getOrdersByPriority: (priority: string) => AdminOrder[];
}

export const useOrders = (): UseOrdersReturn => {
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAdminOrders = useCallback(async (adminId: string): Promise<void> => {
    try {
      setIsLoading(true);

      // Try Supabase first
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('admin_id', adminId)
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error('Supabase admin orders fetch failed');
        }

        if (data && data.length > 0) {
          const formattedOrders: AdminOrder[] = data.map(item => ({
            id: item.id,
            adminId: item.admin_id,
            customerName: item.customer_name,
            customerEmail: item.customer_email,
            customerPhone: item.customer_phone,
            deliveryAddress: item.delivery_address,
            deliveryZone: item.delivery_zone,
            total: parseFloat(item.total),
            status: item.status,
            priority: item.priority,
            notes: item.notes,
            items: item.items || [],
            orderDate: new Date(item.order_date),
            estimatedDeliveryTime: item.estimated_delivery_time,
            orderCapacity: item.order_capacity,
            clusterId: item.cluster_id,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          }));
          setAdminOrders(formattedOrders);
          return;
        }
      } catch (supabaseError) {
        console.log('Supabase admin orders fetch failed, using localStorage fallback');
      }

      // Fallback to localStorage
      const userStorageKey = `@zada_user_${adminId}_admin_data`;
      const storedData = await storage.getItem(userStorageKey);
      if (storedData) {
        const data = JSON.parse(storedData);
        setAdminOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error loading admin orders:', error);
      showError(error, 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCustomerOrders = useCallback(async (customerId: string): Promise<void> => {
    try {
      setIsLoading(true);

      // Try Supabase first
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error('Supabase customer orders fetch failed');
        }

        if (data && data.length > 0) {
          const formattedOrders: CustomerOrder[] = data.map(item => ({
            id: item.id,
            customerId: item.customer_id,
            items: item.items || [],
            total: parseFloat(item.total),
            status: item.status,
            priority: item.priority,
            notes: item.notes,
            orderDate: new Date(item.order_date),
            estimatedDeliveryTime: item.estimated_delivery_time,
            orderCapacity: item.order_capacity,
            clusterId: item.cluster_id,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          }));
          setCustomerOrders(formattedOrders);
          return;
        }
      } catch (supabaseError) {
        console.log('Supabase customer orders fetch failed, using localStorage fallback');
      }

      // Fallback to localStorage
      const userStorageKey = `@zada_user_${customerId}_orders`;
      const storedOrders = await storage.getItem(userStorageKey);
      if (storedOrders) {
        const orders = JSON.parse(storedOrders);
        setCustomerOrders(orders);
      }
    } catch (error) {
      console.error('Error loading customer orders:', error);
      showError(error, 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveAdminOrders = useCallback(async (orders: AdminOrder[]): Promise<void> => {
    try {
      // Try Supabase first
      try {
        if (orders.length > 0) {
          // Delete existing orders for this admin
          await supabase
            .from('orders')
            .delete()
            .eq('admin_id', orders[0].adminId);

          // Insert new orders
          const formattedOrders = orders.map(order => ({
            id: order.id,
            admin_id: order.adminId,
            customer_name: order.customerName,
            customer_email: order.customerEmail,
            customer_phone: order.customerPhone,
            delivery_address: order.deliveryAddress,
            delivery_zone: order.deliveryZone,
            total: order.total.toString(),
            status: order.status,
            priority: order.priority,
            notes: order.notes,
            items: order.items,
            order_date: order.orderDate.toISOString(),
            estimated_delivery_time: order.estimatedDeliveryTime,
            order_capacity: order.orderCapacity,
            cluster_id: order.clusterId,
            created_at: order.createdAt,
            updated_at: order.updatedAt,
          }));

          const { error } = await supabase
            .from('orders')
            .insert(formattedOrders);

          if (error) {
            throw new Error('Supabase admin orders save failed');
          }
        }
      } catch (supabaseError) {
        console.log('Supabase admin orders save failed, using localStorage fallback');
      }

      // Fallback to localStorage
      if (orders.length > 0) {
        const userStorageKey = `@zada_user_${orders[0].adminId}_admin_data`;
        const existingData = await storage.getItem(userStorageKey);
        const data = existingData ? JSON.parse(existingData) : { orders: [], products: [] };
        data.orders = orders;
        await storage.setItem(userStorageKey, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error saving admin orders:', error);
      showError(error, 'Failed to save orders');
    }
  }, []);

  const addAdminOrder = useCallback(async (orderData: Omit<AdminOrder, 'id'>): Promise<boolean> => {
    try {
      const newOrder: AdminOrder = {
        ...orderData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedOrders = [...adminOrders, newOrder];
      setAdminOrders(updatedOrders);
      await saveAdminOrders(updatedOrders);
      showSuccess('Order created successfully!');
      return true;
    } catch (error) {
      showError(error, 'Failed to create order');
      return false;
    }
  }, [adminOrders, saveAdminOrders]);

  const updateOrderStatus = useCallback(async (
    orderId: string, 
    status: string, 
    adminId: string
  ): Promise<boolean> => {
    try {
      const updatedOrders = adminOrders.map(order =>
        order.id === orderId 
          ? { ...order, status: status as any, updatedAt: new Date().toISOString() }
          : order
      );

      setAdminOrders(updatedOrders);
      await saveAdminOrders(updatedOrders);
      showSuccess('Order status updated successfully!');
      return true;
    } catch (error) {
      showError(error, 'Failed to update order status');
      return false;
    }
  }, [adminOrders, saveAdminOrders]);

  const createCustomerOrder = useCallback(async (orderData: {
    customerId: string;
    items: OrderItem[];
    notes?: string;
    deliveryAddress: string;
    deliveryZone: string;
  }): Promise<boolean> => {
    try {
      const total = calculateOrderTotal(orderData.items);
      const newOrder: CustomerOrder = {
        id: Date.now().toString(),
        customerId: orderData.customerId,
        items: orderData.items,
        total,
        status: 'pending',
        priority: 'medium',
        notes: orderData.notes,
        orderDate: new Date(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedOrders = [...customerOrders, newOrder];
      setCustomerOrders(updatedOrders);

      // Save to localStorage
      const userStorageKey = `@zada_user_${orderData.customerId}_orders`;
      await storage.setItem(userStorageKey, JSON.stringify(updatedOrders));

      showSuccess('Order placed successfully!');
      return true;
    } catch (error) {
      showError(error, 'Failed to create order');
      return false;
    }
  }, [customerOrders]);

  const getOrderById = useCallback((id: string): AdminOrder | CustomerOrder | undefined => {
    return [...adminOrders, ...customerOrders].find(order => order.id === id);
  }, [adminOrders, customerOrders]);

  const getOrdersByStatus = useCallback((status: string): AdminOrder[] => {
    return adminOrders.filter(order => order.status === status);
  }, [adminOrders]);

  const getOrdersByPriority = useCallback((priority: string): AdminOrder[] => {
    return adminOrders.filter(order => order.priority === priority);
  }, [adminOrders]);

  return {
    adminOrders,
    customerOrders,
    isLoading,
    loadAdminOrders,
    loadCustomerOrders,
    saveAdminOrders,
    addAdminOrder,
    updateOrderStatus,
    createCustomerOrder,
    getOrderById,
    getOrdersByStatus,
    getOrdersByPriority,
  };
};
