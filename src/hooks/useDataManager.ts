/**
 * React Hook for Data Manager
 * Provides reactive data access and state management
 */

import { useState, useEffect, useCallback } from 'react';
import { dataManager, DataManagerState } from '../services/dataManager';

export const useDataManager = () => {
  const [state, setState] = useState<DataManagerState>(dataManager.getState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to data changes
  useEffect(() => {
    const unsubscribe = dataManager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  // Initialize data manager
  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await dataManager.initialize();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Product operations
  const addProduct = useCallback(async (productData: any) => {
    try {
      setLoading(true);
      setError(null);
      await dataManager.addProduct(productData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProduct = useCallback(async (productId: string, productData: any) => {
    try {
      setLoading(true);
      setError(null);
      await dataManager.updateProduct(productId, productData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteProduct = useCallback(async (productId: string) => {
    try {
      setLoading(true);
      setError(null);
      await dataManager.deleteProduct(productId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Order operations
  const addOrder = useCallback(async (orderData: any) => {
    try {
      setLoading(true);
      setError(null);
      await dataManager.addOrder(orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrder = useCallback(async (orderId: string, orderData: any) => {
    try {
      setLoading(true);
      setError(null);
      await dataManager.updateOrder(orderId, orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cart operations
  const addToCart = useCallback(async (product: any, quantity: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      await dataManager.addToCart(product, quantity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCartItem = useCallback(async (productId: string, quantity: number) => {
    try {
      setLoading(true);
      setError(null);
      await dataManager.updateCartItem(productId, quantity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cart item');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeFromCart = useCallback(async (productId: string) => {
    try {
      setLoading(true);
      setError(null);
      await dataManager.removeFromCart(productId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from cart');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await dataManager.clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cart');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Notification operations
  const addNotification = useCallback(async (notification: any) => {
    try {
      setLoading(true);
      setError(null);
      await dataManager.addNotification(notification);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add notification');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      setLoading(true);
      setError(null);
      await dataManager.markNotificationAsRead(notificationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync data
  const syncData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await dataManager.syncData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync data');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Computed values
  const cartTotal = dataManager.getCartTotal();
  const cartItemCount = dataManager.getCartItemCount();

  return {
    // State
    products: state.products,
    orders: state.orders,
    customers: state.customers,
    cart: state.cart,
    notifications: state.notifications,
    loading,
    error,

    // Computed values
    cartTotal,
    cartItemCount,

    // Operations
    initialize,
    addProduct,
    updateProduct,
    deleteProduct,
    addOrder,
    updateOrder,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    addNotification,
    markNotificationAsRead,
    syncData,

    // Data access methods
    getOrdersByUser: (userId: string) => dataManager.getOrdersByUser(userId),
    getNotificationsByUser: (userId: string) => dataManager.getNotificationsByUser(userId),
    getUnreadNotificationCount: (userId?: string) => dataManager.getUnreadNotificationCount(userId),
  };
};
