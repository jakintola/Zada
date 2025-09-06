/**
 * Global application context
 * Provides shared state and actions across the entire application
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProducts } from '../hooks/useProducts';
import { useOrders } from '../hooks/useOrders';
import { useCart } from '../hooks/useCart';
import { useNotifications } from '../hooks/useNotifications';
import { AppUser, Product, AdminOrder, CustomerOrder, CartItem, Notification } from '../types';

interface AppContextType {
  // Auth state
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (form: { email: string; password: string }) => Promise<boolean>;
  register: (form: {
    name: string;
    email: string;
    password: string;
    role: 'customer' | 'admin';
    phone?: string;
    address?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AppUser>) => Promise<void>;

  // Products state
  products: Product[];
  productsLoading: boolean;
  loadProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  getProductById: (id: string) => Product | undefined;
  getProductsByCategory: (category: string) => Product[];
  searchProducts: (query: string) => Product[];

  // Orders state
  adminOrders: AdminOrder[];
  customerOrders: CustomerOrder[];
  ordersLoading: boolean;
  loadAdminOrders: (adminId: string) => Promise<void>;
  loadCustomerOrders: (customerId: string) => Promise<void>;
  addAdminOrder: (order: Omit<AdminOrder, 'id'>) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: string, adminId: string) => Promise<boolean>;
  createCustomerOrder: (orderData: {
    customerId: string;
    items: Array<{ product: Product; quantity: number }>;
    notes?: string;
    deliveryAddress: string;
    deliveryZone: string;
  }) => Promise<boolean>;
  getOrderById: (id: string) => AdminOrder | CustomerOrder | undefined;

  // Cart state
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  cartLoading: boolean;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartItem: (productId: string) => CartItem | undefined;
  isInCart: (productId: string) => boolean;

  // Notifications state
  notifications: Notification[];
  unreadCount: number;
  showNotification: boolean;
  notificationMessage: string;
  notificationsLoading: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  showTemporaryNotification: (message: string, type?: Notification['type']) => void;
  hideNotification: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Initialize all hooks
  const auth = useAuth();
  const products = useProducts();
  const orders = useOrders();
  const cart = useCart();
  const notifications = useNotifications();

  // Load user-specific data when user changes
  React.useEffect(() => {
    if (auth.user) {
      // Load user-specific data
      if (auth.user.role === 'admin') {
        orders.loadAdminOrders(auth.user.id);
      } else {
        orders.loadCustomerOrders(auth.user.id);
        cart.loadCart(auth.user.id);
      }
      notifications.loadNotifications(auth.user.id);
    } else {
      // Clear user-specific data when logged out
      cart.clearCart();
      notifications.clearAllNotifications();
    }
  }, [auth.user?.id, auth.user?.role]);

  // Save user-specific data when it changes
  React.useEffect(() => {
    if (auth.user) {
      if (auth.user.role === 'customer') {
        cart.saveCart(auth.user.id);
      }
      notifications.saveNotifications(auth.user.id);
    }
  }, [cart.cart, notifications.notifications, auth.user?.id, auth.user?.role]);

  const contextValue: AppContextType = {
    // Auth
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
    updateUser: auth.updateUser,

    // Products
    products: products.products,
    productsLoading: products.isLoading,
    loadProducts: products.loadProducts,
    addProduct: products.addProduct,
    updateProduct: products.updateProduct,
    deleteProduct: products.deleteProduct,
    getProductById: products.getProductById,
    getProductsByCategory: products.getProductsByCategory,
    searchProducts: products.searchProducts,

    // Orders
    adminOrders: orders.adminOrders,
    customerOrders: orders.customerOrders,
    ordersLoading: orders.isLoading,
    loadAdminOrders: orders.loadAdminOrders,
    loadCustomerOrders: orders.loadCustomerOrders,
    addAdminOrder: orders.addAdminOrder,
    updateOrderStatus: orders.updateOrderStatus,
    createCustomerOrder: orders.createCustomerOrder,
    getOrderById: orders.getOrderById,

    // Cart
    cart: cart.cart,
    cartCount: cart.cartCount,
    cartTotal: cart.cartTotal,
    cartLoading: cart.isLoading,
    addToCart: cart.addToCart,
    removeFromCart: cart.removeFromCart,
    updateQuantity: cart.updateQuantity,
    clearCart: cart.clearCart,
    getCartItem: cart.getCartItem,
    isInCart: cart.isInCart,

    // Notifications
    notifications: notifications.notifications,
    unreadCount: notifications.unreadCount,
    showNotification: notifications.showNotification,
    notificationMessage: notifications.notificationMessage,
    notificationsLoading: notifications.isLoading,
    addNotification: notifications.addNotification,
    markAsRead: notifications.markAsRead,
    markAllAsRead: notifications.markAllAsRead,
    removeNotification: notifications.removeNotification,
    clearAllNotifications: notifications.clearAllNotifications,
    showTemporaryNotification: notifications.showTemporaryNotification,
    hideNotification: notifications.hideNotification,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
