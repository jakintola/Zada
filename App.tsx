/**
 * ZADA Water Delivery App - Simplified Version
 * This version maintains the original functionality with improved structure
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './supabaseClient';
import { storage } from './storageUtils';

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get('window');

// Define proper TypeScript interfaces
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  minStock: number;
  category: 'water' | 'dispenser' | 'accessories';
  supplier: string;
  image: string;
  description: string;
  features: string[];
}

interface OrderItem {
  product: Product;
  quantity: number;
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'admin';
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

interface CustomerOrder {
  id: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  orderDate: Date;
  estimatedDeliveryTime?: string;
  orderCapacity?: number;
  clusterId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AdminOrder {
  id: string;
  adminId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryAddress: string;
  deliveryZone: string;
  total: number;
  status: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  items: OrderItem[];
  orderDate: Date;
  estimatedDeliveryTime?: string;
  orderCapacity?: number;
  clusterId?: string;
  createdAt?: string;
  updatedAt?: string;
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

const mockOrders: AdminOrder[] = [
  {
    id: '1',
    adminId: 'admin1',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '+2348012345678',
    deliveryAddress: '123 Main St, Lagos',
    deliveryZone: 'Zone A',
    total: 2400,
    status: 'pending',
    priority: 'medium',
    notes: 'Please call before delivery',
    items: [
      { product: mockProducts[0], quantity: 2 }
    ],
    orderDate: new Date(),
    estimatedDeliveryTime: '2-3 hours',
    orderCapacity: 2,
    clusterId: 'cluster1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export default function App() {
  // Authentication state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<AppUser | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState<'customer' | 'admin'>('customer');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerAddress, setRegisterAddress] = useState('');

  // App state
  const [currentView, setCurrentView] = useState<'dashboard' | 'inventory' | 'orders' | 'delivery' | 'analytics' | 'notifications' | 'supportInbox'>('dashboard');
  const [customerView, setCustomerView] = useState<'home' | 'products' | 'cart' | 'orders' | 'profile'>('home');
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>(mockOrders);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number; addedAt: Date }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load user from storage on mount
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const storedUser = await storage.getItem('@zada_current_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    }
  };

  const saveUserToStorage = async (userData: AppUser) => {
    try {
      await storage.setItem('@zada_current_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please enter email and password');
      return;
    }

    try {
      setIsLoading(true);
      
      // Try Supabase first
      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.trim().toLowerCase())
          .eq('password', password)
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
        return;
      } catch (supabaseError) {
        console.log('Supabase login failed, trying localStorage fallback');
      }

      // Fallback to localStorage
      const usersData = await storage.getItem('@zada_users');
      if (!usersData) {
        Alert.alert('Login Failed', 'No users found. Please register first.');
        return;
      }

      const users: AppUser[] = JSON.parse(usersData);
      const foundUser = users.find(
        u => u.email.toLowerCase() === email.toLowerCase() && 
             u.password === password
      );

      if (!foundUser) {
        Alert.alert('Login Failed', 'Invalid email or password');
        return;
      }

      setUser(foundUser);
      await saveUserToStorage(foundUser);
      Alert.alert('Success', 'Login successful!');
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      Alert.alert('Missing info', 'Please enter name, email and password');
      return;
    }

    // Security: Restrict admin account creation to ZADA Foods domain
    if (registerRole === 'admin') {
      const email = registerEmail.trim().toLowerCase();
      const allowedDomains = ['@zadafoods.com', '@zada.com'];
      const allowedSpecificEmails = [
        'admin@zada.com',
        'manager@zada.com',
        'supervisor@zada.com'
      ];
      
      const isAllowedDomain = allowedDomains.some(domain => email.endsWith(domain));
      const isAllowedEmail = allowedSpecificEmails.includes(email);
      
      if (!isAllowedDomain && !isAllowedEmail) {
        Alert.alert('Access Denied', 'Admin accounts require @zadafoods.com or @zada.com email addresses. Please use firstname.lastname@zadafoods.com format.');
        return;
      }
    }

    try {
      setIsLoading(true);

      const newUser: AppUser = {
        id: Date.now().toString(),
        name: registerName.trim(),
        email: registerEmail.trim().toLowerCase(),
        password: registerPassword,
        role: registerRole,
        phone: registerPhone?.trim(),
        address: registerAddress?.trim(),
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
        return;
      } catch (supabaseError) {
        console.log('Supabase registration failed, using localStorage fallback');
      }

      // Fallback to localStorage
      const usersData = await storage.getItem('@zada_users');
      const users: AppUser[] = usersData ? JSON.parse(usersData) : [];

      const emailExists = users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase());
      if (emailExists) {
        Alert.alert('Email Already Exists', 'An account with this email already exists');
        return;
      }

      users.push(newUser);
      await storage.setItem('@zada_users', JSON.stringify(users));

      setUser(newUser);
      await saveUserToStorage(newUser);
      Alert.alert('Success', 'Registration successful!');
    } catch (error) {
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setUser(null);
    await storage.removeItem('@zada_current_user');
    Alert.alert('Success', 'Logged out successfully');
  };

  const addToCart = (product: Product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prevCart, { product, quantity, addedAt: new Date() }];
      }
    });
    Alert.alert('Success', `${product.name} added to cart!`);
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const calculateCartTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  // Render authentication screen
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.authContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>ZADA Water Delivery</Text>
              <Text style={styles.subtitle}>
                {isRegistering ? 'Create your account' : 'Welcome back!'}
              </Text>
            </View>

            <View style={styles.form}>
              {isRegistering && (
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={registerName}
                  onChangeText={setRegisterName}
                />
              )}

              <TextInput
                style={styles.input}
                placeholder="Email"
                value={isRegistering ? registerEmail : email}
                onChangeText={isRegistering ? setRegisterEmail : setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                value={isRegistering ? registerPassword : password}
                onChangeText={isRegistering ? setRegisterPassword : setPassword}
                secureTextEntry
              />

              {isRegistering && (
                <>
                  <View style={styles.roleSelector}>
                    <Text style={styles.roleLabel}>Account Type:</Text>
                    <View style={styles.roleButtons}>
                      <TouchableOpacity
                        style={[styles.roleButton, registerRole === 'customer' && styles.activeRoleButton]}
                        onPress={() => setRegisterRole('customer')}
                      >
                        <Text style={[styles.roleButtonText, registerRole === 'customer' && styles.activeRoleButtonText]}>
                          Customer
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.roleButton, registerRole === 'admin' && styles.activeRoleButton]}
                        onPress={() => setRegisterRole('admin')}
                      >
                        <Text style={[styles.roleButtonText, registerRole === 'admin' && styles.activeRoleButtonText]}>
                          Admin
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {registerRole === 'admin' && (
                      <Text style={styles.adminEmailHint}>
                        💡 Admin accounts require @zadafoods.com or @zada.com email address
                      </Text>
                    )}
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="Phone (optional)"
                    value={registerPhone}
                    onChangeText={setRegisterPhone}
                    keyboardType="phone-pad"
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Address (optional)"
                    value={registerAddress}
                    onChangeText={setRegisterAddress}
                    multiline
                    numberOfLines={2}
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.loginButton}
                onPress={isRegistering ? handleRegister : handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.loginButtonText}>
                    {isRegistering ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchAuth}
                onPress={() => setIsRegistering(!isRegistering)}
              >
                <Text style={styles.switchAuthText}>
                  {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Render customer interface
  if (user.role === 'customer') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ZADA Water Delivery</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {customerView === 'home' && (
            <View>
              <Text style={styles.welcomeText}>
                Welcome back, {user.name}! 👋
              </Text>
              
              <View style={styles.statsCard}>
                <Text style={styles.statsTitle}>Your Stats</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{cart.length}</Text>
                    <Text style={styles.statLabel}>Items in Cart</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{customerOrders.length}</Text>
                    <Text style={styles.statLabel}>Total Orders</Text>
                  </View>
                </View>
              </View>

              <View style={styles.quickActionsCard}>
                <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => setCustomerView('products')}
                  >
                    <Text style={styles.quickActionButtonText}>Browse Products</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickActionButton, styles.outlineButton]}
                    onPress={() => setCustomerView('cart')}
                  >
                    <Text style={[styles.quickActionButtonText, styles.outlineButtonText]}>View Cart</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {customerView === 'products' && (
            <View>
              <Text style={styles.sectionTitle}>Our Products</Text>
              {products.map((product) => (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productIcon}>{product.image}</Text>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productPrice}>₦{product.price.toLocaleString()}</Text>
                    </View>
                  </View>
                  <Text style={styles.productDescription}>{product.description}</Text>
                  <TouchableOpacity
                    style={styles.addToCartButton}
                    onPress={() => addToCart(product)}
                  >
                    <Text style={styles.addToCartButtonText}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {customerView === 'cart' && (
            <View>
              <Text style={styles.sectionTitle}>Shopping Cart</Text>
              {cart.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>Your cart is empty</Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => setCustomerView('products')}
                  >
                    <Text style={styles.emptyButtonText}>Browse Products</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {cart.map((item) => (
                    <View key={item.product.id} style={styles.cartItemCard}>
                      <View style={styles.cartItemHeader}>
                        <Text style={styles.cartItemIcon}>{item.product.image}</Text>
                        <View style={styles.cartItemInfo}>
                          <Text style={styles.cartItemName}>{item.product.name}</Text>
                          <Text style={styles.cartItemPrice}>
                            ₦{item.product.price.toLocaleString()} × {item.quantity}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cartItemActions}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Text style={styles.quantityButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Text style={styles.quantityButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <View style={styles.cartSummaryCard}>
                    <Text style={styles.cartTotalText}>
                      Total: ₦{calculateCartTotal().toLocaleString()}
                    </Text>
                    <TouchableOpacity
                      style={styles.checkoutButton}
                      onPress={() => Alert.alert('Checkout', 'Checkout functionality will be implemented')}
                    >
                      <Text style={styles.checkoutButtonText}>Checkout</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomNavigation}>
          <TouchableOpacity
            style={[styles.navItem, customerView === 'home' && styles.activeNavItem]}
            onPress={() => setCustomerView('home')}
          >
            <Text style={[styles.navText, customerView === 'home' && styles.activeNavText]}>
              🏠 Home
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, customerView === 'products' && styles.activeNavItem]}
            onPress={() => setCustomerView('products')}
          >
            <Text style={[styles.navText, customerView === 'products' && styles.activeNavText]}>
              🛍️ Products
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, customerView === 'cart' && styles.activeNavItem]}
            onPress={() => setCustomerView('cart')}
          >
            <Text style={[styles.navText, customerView === 'cart' && styles.activeNavText]}>
              🛒 Cart ({cart.length})
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render admin interface
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.welcomeText}>
          Welcome, {user.name}! 👨‍💼
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{products.length}</Text>
            <Text style={styles.statLabel}>Total Products</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{adminOrders.length}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {adminOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length}
            </Text>
            <Text style={styles.statLabel}>Pending Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              ₦{adminOrders.reduce((sum, order) => sum + order.total, 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
        </View>

        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => setCurrentView('inventory')}
            >
              <Text style={styles.quickActionButtonText}>Manage Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.outlineButton]}
              onPress={() => setCurrentView('orders')}
            >
              <Text style={[styles.quickActionButtonText, styles.outlineButtonText]}>View Orders</Text>
            </TouchableOpacity>
          </View>
        </View>

        {currentView === 'inventory' && (
          <View>
            <Text style={styles.sectionTitle}>Inventory Management</Text>
            {products.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <Text style={styles.productIcon}>{product.image}</Text>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productPrice}>₦{product.price.toLocaleString()}</Text>
                    <Text style={styles.productStock}>
                      Stock: {product.stock} (Min: {product.minStock})
                    </Text>
                  </View>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => Alert.alert('Edit Product', 'Edit functionality will be implemented')}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => Alert.alert('Delete Product', 'Delete functionality will be implemented')}
                  >
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {currentView === 'orders' && (
          <View>
            <Text style={styles.sectionTitle}>Order Management</Text>
            {adminOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>Order #{order.id}</Text>
                  <Text style={[styles.orderStatus, { color: getStatusColor(order.status) }]}>
                    {order.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.customerName}>{order.customerName}</Text>
                <Text style={styles.orderTotal}>Total: ₦{order.total.toLocaleString()}</Text>
                <Text style={styles.orderDate}>
                  {new Date(order.orderDate).toLocaleDateString()}
                </Text>
                <View style={styles.orderActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.outlineButton]}
                    onPress={() => Alert.alert('View Details', 'View details functionality will be implemented')}
                  >
                    <Text style={[styles.actionButtonText, styles.outlineButtonText]}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => Alert.alert('Update Status', 'Update status functionality will be implemented')}
                  >
                    <Text style={styles.actionButtonText}>Update Status</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[styles.navItem, currentView === 'dashboard' && styles.activeNavItem]}
          onPress={() => setCurrentView('dashboard')}
        >
          <Text style={[styles.navText, currentView === 'dashboard' && styles.activeNavText]}>
            📊 Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, currentView === 'inventory' && styles.activeNavItem]}
          onPress={() => setCurrentView('inventory')}
        >
          <Text style={[styles.navText, currentView === 'inventory' && styles.activeNavText]}>
            📦 Inventory
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, currentView === 'orders' && styles.activeNavItem]}
          onPress={() => setCurrentView('orders')}
        >
          <Text style={[styles.navText, currentView === 'orders' && styles.activeNavText]}>
            🛒 Orders
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStatusColor = (status: string) => {
  const colors = {
    pending: '#F59E0B',
    confirmed: '#3B82F6',
    out_for_delivery: '#8B5CF6',
    delivered: '#10B981',
    cancelled: '#EF4444',
  };
  return colors[status as keyof typeof colors] || '#6B7280';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#0EA5E9',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  roleSelector: {
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  activeRoleButton: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeRoleButtonText: {
    color: 'white',
  },
  adminEmailHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  loginButton: {
    backgroundColor: '#0EA5E9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchAuth: {
    alignItems: 'center',
  },
  switchAuthText: {
    color: '#0EA5E9',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0EA5E9',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  quickActionsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#0EA5E9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0EA5E9',
  },
  outlineButtonText: {
    color: '#0EA5E9',
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  productPrice: {
    fontSize: 16,
    color: '#0EA5E9',
    fontWeight: '500',
  },
  productStock: {
    fontSize: 14,
    color: '#6B7280',
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  addToCartButton: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#0EA5E9',
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  cartItemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cartItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartItemIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#6B7280',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  quantityButton: {
    backgroundColor: '#E5E7EB',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    minWidth: 30,
    textAlign: 'center',
  },
  cartSummaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cartTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  checkoutButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  customerName: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 14,
    color: '#0EA5E9',
    fontWeight: '500',
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    backgroundColor: '#0EA5E9' + '20',
  },
  navText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  activeNavText: {
    color: '#0EA5E9',
    fontWeight: '500',
  },
});
