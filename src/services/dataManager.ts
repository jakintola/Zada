/**
 * Centralized Data Manager
 * Handles all data operations with proper synchronization and consistency
 */

import { databaseService } from './database';
import { storage } from '../../storageUtils';

export interface DataManagerState {
  products: any[];
  orders: any[];
  customers: any[];
  cart: any[];
  notifications: any[];
}

class DataManager {
  private listeners: Set<(state: DataManagerState) => void> = new Set();
  private state: DataManagerState = {
    products: [],
    orders: [],
    customers: [],
    cart: [],
    notifications: []
  };

  // Subscribe to state changes
  subscribe(listener: (state: DataManagerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of state changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Get current state
  getState(): DataManagerState {
    return { ...this.state };
  }

  // Initialize data manager
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing Data Manager...');
      
      // Load all data from database
      await this.loadAllData();
      
      console.log('✅ Data Manager initialized');
    } catch (error) {
      console.error('❌ Error initializing Data Manager:', error);
      throw error;
    }
  }

  // Load all data from database
  async loadAllData(): Promise<void> {
    try {
      console.log('📊 Loading all data...');
      
      // Load products
      const products = await databaseService.getAllProducts();
      this.state.products = products;
      console.log('📦 Products loaded:', products.map(p => ({ id: p.id, name: p.name })));
      
      // Load orders
      const orders = await databaseService.getAllOrders();
      this.state.orders = orders;
      
      // Load customers
      const customers = await databaseService.getAllUsers();
      this.state.customers = customers;
      
      // Load cart from local storage
      const cartData = await storage.getItem('@zada_cart');
      this.state.cart = cartData ? JSON.parse(cartData) : [];
      
      // Load notifications
      const notificationsData = await storage.getItem('@zada_notifications');
      this.state.notifications = notificationsData ? JSON.parse(notificationsData) : [];
      
      console.log('📊 Data loaded:', {
        products: products.length,
        orders: orders.length,
        customers: customers.length,
        cart: this.state.cart.length,
        notifications: this.state.notifications.length
      });
      
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error loading data:', error);
      throw error;
    }
  }

  // Product Management
  async addProduct(productData: any): Promise<void> {
    try {
      console.log('➕ Adding product:', productData.name);
      
      const newProduct = await databaseService.createProduct(productData);
      this.state.products = [...this.state.products, newProduct];
      
      await this.saveProductsToStorage();
      this.notifyListeners();
      
      console.log('✅ Product added successfully. Total products:', this.state.products.length);
      console.log('📦 Current products:', this.state.products.map(p => ({ id: p.id, name: p.name })));
    } catch (error) {
      console.error('❌ Error adding product:', error);
      throw error;
    }
  }

  async updateProduct(productId: string, productData: any): Promise<void> {
    try {
      console.log('✏️ Updating product:', productId);
      
      const updatedProducts = this.state.products.map(p => 
        p.id === productId ? { ...p, ...productData, updated_at: new Date().toISOString() } : p
      );
      
      this.state.products = updatedProducts;
      await this.saveProductsToStorage();
      this.notifyListeners();
      
      console.log('✅ Product updated successfully');
    } catch (error) {
      console.error('❌ Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting product:', productId);
      
      this.state.products = this.state.products.filter(p => p.id !== productId);
      await this.saveProductsToStorage();
      this.notifyListeners();
      
      console.log('✅ Product deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      throw error;
    }
  }

  // Order Management
  async addOrder(orderData: any): Promise<void> {
    try {
      console.log('📦 Adding order:', orderData.order_number);
      
      const newOrder = await databaseService.createOrder(orderData);
      this.state.orders = [...this.state.orders, newOrder];
      
      await this.saveOrdersToStorage();
      this.notifyListeners();
      
      console.log('✅ Order added successfully');
    } catch (error) {
      console.error('❌ Error adding order:', error);
      throw error;
    }
  }

  async updateOrder(orderId: string, orderData: any): Promise<void> {
    try {
      console.log('✏️ Updating order:', orderId);
      
      const updatedOrders = this.state.orders.map(o => 
        o.id === orderId ? { ...o, ...orderData, updated_at: new Date().toISOString() } : o
      );
      
      this.state.orders = updatedOrders;
      await this.saveOrdersToStorage();
      this.notifyListeners();
      
      console.log('✅ Order updated successfully');
    } catch (error) {
      console.error('❌ Error updating order:', error);
      throw error;
    }
  }

  // Cart Management
  async addToCart(product: any, quantity: number = 1): Promise<void> {
    try {
      console.log('🛒 Adding to cart:', product.name, 'x', quantity);
      
      const existingItem = this.state.cart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        this.state.cart.push({
          product,
          quantity,
          unit_price: product.price,
          total_price: product.price * quantity
        });
      }
      
      await this.saveCartToStorage();
      this.notifyListeners();
      
      console.log('✅ Added to cart successfully');
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      throw error;
    }
  }

  async updateCartItem(productId: string, quantity: number): Promise<void> {
    try {
      console.log('🛒 Updating cart item:', productId, 'quantity:', quantity);
      
      if (quantity <= 0) {
        this.state.cart = this.state.cart.filter(item => item.product.id !== productId);
      } else {
        const item = this.state.cart.find(item => item.product.id === productId);
        if (item) {
          item.quantity = quantity;
          item.total_price = item.unit_price * quantity;
        }
      }
      
      await this.saveCartToStorage();
      this.notifyListeners();
      
      console.log('✅ Cart updated successfully');
    } catch (error) {
      console.error('❌ Error updating cart:', error);
      throw error;
    }
  }

  async removeFromCart(productId: string): Promise<void> {
    try {
      console.log('🗑️ Removing from cart:', productId);
      
      this.state.cart = this.state.cart.filter(item => item.product.id !== productId);
      await this.saveCartToStorage();
      this.notifyListeners();
      
      console.log('✅ Removed from cart successfully');
    } catch (error) {
      console.error('❌ Error removing from cart:', error);
      throw error;
    }
  }

  async clearCart(): Promise<void> {
    try {
      console.log('🗑️ Clearing cart');
      
      this.state.cart = [];
      await this.saveCartToStorage();
      this.notifyListeners();
      
      console.log('✅ Cart cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing cart:', error);
      throw error;
    }
  }

  // Notification Management
  async addNotification(notification: any): Promise<void> {
    try {
      console.log('🔔 Adding notification:', notification.title);
      
      this.state.notifications = [notification, ...this.state.notifications];
      await this.saveNotificationsToStorage();
      this.notifyListeners();
      
      console.log('✅ Notification added successfully');
    } catch (error) {
      console.error('❌ Error adding notification:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      console.log('✅ Marking notification as read:', notificationId);
      
      const notification = this.state.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        await this.saveNotificationsToStorage();
        this.notifyListeners();
      }
      
      console.log('✅ Notification marked as read');
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  // Storage persistence methods
  private async saveProductsToStorage(): Promise<void> {
    await storage.setItem('@zada_products', JSON.stringify(this.state.products));
  }

  private async saveOrdersToStorage(): Promise<void> {
    await storage.setItem('@zada_orders', JSON.stringify(this.state.orders));
  }

  private async saveCartToStorage(): Promise<void> {
    await storage.setItem('@zada_cart', JSON.stringify(this.state.cart));
  }

  private async saveNotificationsToStorage(): Promise<void> {
    await storage.setItem('@zada_notifications', JSON.stringify(this.state.notifications));
  }

  // Data consistency methods
  async syncData(): Promise<void> {
    try {
      console.log('🔄 Syncing data...');
      await this.loadAllData();
      console.log('✅ Data synced successfully');
    } catch (error) {
      console.error('❌ Error syncing data:', error);
      throw error;
    }
  }

  // Get filtered data
  getProducts(): any[] {
    return [...this.state.products];
  }

  getOrders(): any[] {
    return [...this.state.orders];
  }

  getCustomers(): any[] {
    return [...this.state.customers];
  }

  getCart(): any[] {
    return [...this.state.cart];
  }

  getNotifications(): any[] {
    return [...this.state.notifications];
  }

  // Get data by user
  getOrdersByUser(userId: string): any[] {
    return this.state.orders.filter(order => order.customer_id === userId);
  }

  getNotificationsByUser(userId: string): any[] {
    return this.state.notifications.filter(notification => 
      !notification.userId || notification.userId === userId
    );
  }

  // Calculate totals
  getCartTotal(): number {
    return this.state.cart.reduce((total, item) => total + item.total_price, 0);
  }

  getCartItemCount(): number {
    return this.state.cart.reduce((total, item) => total + item.quantity, 0);
  }

  getUnreadNotificationCount(userId?: string): number {
    const userNotifications = userId ? this.getNotificationsByUser(userId) : this.state.notifications;
    return userNotifications.filter(n => !n.read).length;
  }
}

export const dataManager = new DataManager();
