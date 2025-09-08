/**
 * Simplified Global application context
 * Provides shared state and actions across the entire application
 */

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { AppUser, Product, AdminOrder, CustomerOrder, CartItem, Notification } from '../types';
import { storage } from '../../storageUtils';
import { supabase } from '../../supabaseClient';

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

  // Products state
  products: Product[];
  productsLoading: boolean;
  loadProducts: () => Promise<void>;

  // Orders state
  adminOrders: AdminOrder[];
  customerOrders: CustomerOrder[];
  ordersLoading: boolean;

  // Cart state
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;

  // Notifications state
  notifications: Notification[];
  unreadCount: number;
  showNotification: boolean;
  notificationMessage: string;
  showTemporaryNotification: (message: string, type?: Notification['type']) => void;
  hideNotification: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

// Mock data
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Premium Water 20L',
    price: 1200,
    stock: 50,
    minStock: 10,
    category: 'water',
    supplier: 'AquaPure',
    image: '💧',
    description: 'Premium purified water in 20L container',
    features: ['BPA Free', 'Purified', '20L Capacity']
  },
  {
    id: '2',
    name: 'Water Dispenser',
    price: 25000,
    stock: 15,
    minStock: 5,
    category: 'dispenser',
    supplier: 'CoolTech',
    image: '🚰',
    description: 'Electric water dispenser with hot and cold options',
    features: ['Hot & Cold', 'Energy Efficient', 'Easy to Clean']
  },
  {
    id: '3',
    name: 'Water Filter',
    price: 8500,
    stock: 30,
    minStock: 8,
    category: 'accessories',
    supplier: 'FilterPro',
    image: '🔧',
    description: 'Advanced water filtration system',
    features: ['Multi-stage Filtration', 'Long Lasting', 'Easy Installation']
  }
];

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Auth state
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Products state
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [productsLoading, setProductsLoading] = useState(false);

  // Orders state
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  // Computed values
  const isAuthenticated = !!user;
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Load user from storage on mount
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  // Load user-specific data when user changes
  useEffect(() => {
    if (user) {
      loadProducts();
      if (user.role === 'customer') {
        loadCart(user.id);
      }
    } else {
      setCart([]);
      setNotifications([]);
    }
  }, [user?.id, user?.role]);

  // Save user-specific data when it changes
  useEffect(() => {
    if (user && user.role === 'customer') {
      saveCart(user.id);
    }
  }, [cart, user?.id, user?.role]);

  // Auth functions
  const loadUserFromStorage = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const storedUser = await storage.getItem('@zada_current_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserToStorage = async (userData: AppUser): Promise<void> => {
    try {
      await storage.setItem('@zada_current_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  };

  const validateAdminEmail = (email: string): boolean => {
    const normalizedEmail = email.trim().toLowerCase();
    const allowedDomains = ['@zadafoods.com', '@zada.com'];
    const allowedEmails = ['admin@zada.com', 'manager@zada.com', 'supervisor@zada.com'];
    
    const isAllowedDomain = allowedDomains.some(domain => 
      normalizedEmail.endsWith(domain)
    );
    const isAllowedEmail = allowedEmails.includes(normalizedEmail);
    return isAllowedDomain || isAllowedEmail;
  };

  const login = async (form: { email: string; password: string }): Promise<boolean> => {
    try {
      setIsLoading(true);

      if (!form.email.trim() || !form.password.trim()) {
        Alert.alert('Missing Information', 'Please enter both email and password');
        return false;
      }

      // Try Supabase first
      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', form.email.trim().toLowerCase())
          .eq('password', form.password)
          .single();

        if (error || !users) {
          throw new Error('Supabase login failed');
        }

        const userData: AppUser = {
          id: users.id,
          name: users.name,
          email: users.email,
          password: users.password,
          role: users.role,
          phone: users.phone,
          address: users.address,
          created_at: users.created_at,
          updated_at: users.updated_at,
        };

        setUser(userData);
        await saveUserToStorage(userData);
        Alert.alert('Success', 'Login successful!');
        return true;
      } catch (supabaseError) {
        console.log('Supabase login failed, trying localStorage fallback');
      }

      // Fallback to localStorage
      const usersData = await storage.getItem('@zada_users');
      if (!usersData) {
        Alert.alert('Login Failed', 'No users found. Please register first.');
        return false;
      }

      const users: AppUser[] = JSON.parse(usersData);
      const foundUser = users.find(
        u => u.email.toLowerCase() === form.email.toLowerCase() && 
             u.password === form.password
      );

      if (!foundUser) {
        Alert.alert('Login Failed', 'Invalid email or password');
        return false;
      }

      setUser(foundUser);
      await saveUserToStorage(foundUser);
      Alert.alert('Success', 'Login successful!');
      return true;
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (form: {
    name: string;
    email: string;
    password: string;
    role: 'customer' | 'admin';
    phone?: string;
    address?: string;
  }): Promise<boolean> => {
    try {
      setIsLoading(true);

      if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
        Alert.alert('Missing Information', 'Please fill in all required fields');
        return false;
      }

      if (form.password.length < 6) {
        Alert.alert('Invalid Password', 'Password must be at least 6 characters long');
        return false;
      }

      if (form.role === 'admin' && !validateAdminEmail(form.email)) {
        Alert.alert(
          'Access Denied', 
          'Admin accounts require @zadafoods.com or @zada.com email addresses'
        );
        return false;
      }

      const newUser: AppUser = {
        id: Date.now().toString(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        phone: form.phone?.trim(),
        address: form.address?.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Try Supabase first
      try {
        const { error } = await supabase
          .from('users')
          .insert([{
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            password: newUser.password,
            role: newUser.role,
            phone: newUser.phone,
            address: newUser.address,
            created_at: newUser.created_at,
            updated_at: newUser.updated_at,
          }]);

        if (error) {
          throw new Error('Supabase registration failed');
        }

        setUser(newUser);
        await saveUserToStorage(newUser);
        Alert.alert('Success', 'Registration successful!');
        return true;
      } catch (supabaseError) {
        console.log('Supabase registration failed, using localStorage fallback');
      }

      // Fallback to localStorage
      const usersData = await storage.getItem('@zada_users');
      const users: AppUser[] = usersData ? JSON.parse(usersData) : [];

      const emailExists = users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase());
      if (emailExists) {
        Alert.alert('Email Already Exists', 'An account with this email already exists');
        return false;
      }

      users.push(newUser);
      await storage.setItem('@zada_users', JSON.stringify(users));

      setUser(newUser);
      await saveUserToStorage(newUser);
      Alert.alert('Success', 'Registration successful!');
      return true;
    } catch (error) {
      Alert.alert('Error', 'Registration failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setUser(null);
      await storage.removeItem('@zada_current_user');
      Alert.alert('Success', 'Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Products functions
  const loadProducts = async (): Promise<void> => {
    try {
      setProductsLoading(true);
      setProducts(mockProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  // Cart functions
  const loadCart = async (userId: string): Promise<void> => {
    try {
      const cartKey = `@zada_user_${userId}_cart`;
      const storedCart = await storage.getItem(cartKey);
      if (storedCart) {
        const cartData = JSON.parse(storedCart);
        const formattedCart = cartData.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt),
        }));
        setCart(formattedCart);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const saveCart = async (userId: string): Promise<void> => {
    try {
      const cartKey = `@zada_user_${userId}_cart`;
      await storage.setItem(cartKey, JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = async (product: Product, quantity = 1): Promise<void> => {
    try {
      setCart(prevCart => {
        const existingItem = prevCart.find(item => item.product.id === product.id);
        
        if (existingItem) {
          return prevCart.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          const newItem: CartItem = {
            product,
            quantity,
            addedAt: new Date(),
          };
          return [...prevCart, newItem];
        }
      });
      Alert.alert('Success', `${product.name} added to cart!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const removeFromCart = async (productId: string): Promise<void> => {
    try {
      setCart(prevCart => {
        const item = prevCart.find(item => item.product.id === productId);
        if (item) {
          Alert.alert('Success', `${item.product.name} removed from cart`);
        }
        return prevCart.filter(item => item.product.id !== productId);
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to remove item from cart');
    }
  };

  const updateQuantity = async (productId: string, quantity: number): Promise<void> => {
    try {
      if (quantity <= 0) {
        await removeFromCart(productId);
        return;
      }

      setCart(prevCart =>
        prevCart.map(item =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        )
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update quantity');
    }
  };

  const clearCart = async (): Promise<void> => {
    try {
      setCart([]);
      Alert.alert('Success', 'Cart cleared successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear cart');
    }
  };

  // Notifications functions
  const showTemporaryNotification = (message: string, type: Notification['type'] = 'info'): void => {
    setNotificationMessage(message);
    setShowNotification(true);
    
    const newNotification: Notification = {
      id: Date.now().toString(),
      type,
      title: 'Notification',
      message,
      read: false,
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev]);

    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  };

  const hideNotification = (): void => {
    setShowNotification(false);
  };

  const contextValue: AppContextType = {
    // Auth
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,

    // Products
    products,
    productsLoading,
    loadProducts,

    // Orders
    adminOrders,
    customerOrders,
    ordersLoading,

    // Cart
    cart,
    cartCount,
    cartTotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,

    // Notifications
    notifications,
    unreadCount,
    showNotification,
    notificationMessage,
    showTemporaryNotification,
    hideNotification,
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
