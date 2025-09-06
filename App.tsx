// ZADA Water Delivery App - Enhanced Business Intelligence Platform
import React, { useState, useCallback, useEffect, useRef } from 'react';
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

// Customer database interfaces
interface CustomerProfile {
  id?: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}
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

interface CustomerOrder {
  id: string;
  items?: OrderItem[];
  product?: Product;
  quantity?: number;
  total: number;
  status: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered';
  orderDate: Date;
  deliveryAddress?: string;
  deliveryPhone?: string;
  paymentMethod: 'cash' | 'card' | 'transfer';
  customerName: string;
  customerEmail: string;
  notes?: string;
}

interface AdminOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  status: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered';
  orderDate: Date;
  deliveryAddress: string;
  deliveryZone: string;
  coordinates: { lat: number; lng: number };
  orderCapacity: number;
  priority: 'high' | 'medium' | 'low';
  estimatedDeliveryTime: string;
  clusterId: string | null;
  items?: OrderItem[];
  paymentMethod: 'cash' | 'card' | 'transfer';
  notes?: string;
}

// App user model for registration/login
interface AppUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'admin';
  phone?: string;
  address?: string;
}

const STORAGE_KEYS = {
  users: '@zada_users',
  currentUser: '@zada_current_user',
};

// Generate user-specific storage keys
const getUserStorageKey = (userId: string, key: string) => `@zada_user_${userId}_${key}`;

// Load user-specific admin data
const loadUserAdminData = async (userId: string) => {
  try {
    const productsKey = getUserStorageKey(userId, 'admin_products');
    const ordersKey = getUserStorageKey(userId, 'admin_orders');
    
    const storedProducts = await storage.getItem(productsKey);
    const storedOrders = await storage.getItem(ordersKey);
    
    return {
      products: storedProducts ? JSON.parse(storedProducts) : [...mockProducts],
      orders: storedOrders ? JSON.parse(storedOrders) : [...mockOrders]
    };
  } catch (error) {
    console.error('Failed to load user admin data:', error);
    return {
      products: [...mockProducts],
      orders: [...mockOrders]
    };
  }
};

// Save user-specific admin data
const saveUserAdminData = async (userId: string, products: Product[], orders: AdminOrder[]) => {
  try {
    const productsKey = getUserStorageKey(userId, 'admin_products');
    const ordersKey = getUserStorageKey(userId, 'admin_orders');
    
    await storage.setItem(productsKey, JSON.stringify(products));
    await storage.setItem(ordersKey, JSON.stringify(orders));
  } catch (error) {
    console.error('Failed to save user admin data:', error);
  }
};

// Load products for all users (customers and admin)
const loadProducts = async () => {
  try {
    const storedProducts = await storage.getItem('@zada_products');
    if (storedProducts) {
      return JSON.parse(storedProducts);
    }
    // If no stored products, return mock products
    return [...mockProducts];
  } catch (error) {
    console.error('Failed to load products:', error);
    return [...mockProducts];
  }
};

// Save products globally
const saveProducts = async (products: Product[]) => {
  try {
    await storage.setItem('@zada_products', JSON.stringify(products));
  } catch (error) {
    console.error('Failed to save products:', error);
  }
};

const loadUsersFromStorage = async (): Promise<AppUser[]> => {
  try {
    const raw = await storage.getItem(STORAGE_KEYS.users);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load users', e);
    return [];
  }
};

const saveUsersToStorage = async (users: AppUser[]) => {
  try {
    await storage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users', e);
  }
};

const loadCurrentUser = async (): Promise<AppUser | null> => {
  try {
    const raw = await storage.getItem(STORAGE_KEYS.currentUser);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to load current user', e);
    return null;
  }
};

const saveCurrentUser = async (user: AppUser | null) => {
  try {
    if (user) {
      await storage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
    } else {
      await storage.removeItem(STORAGE_KEYS.currentUser);
    }
  } catch (e) {
    console.error('Failed to save current user', e);
  }
};

// Customer database functions
const saveCustomerProfile = async (customer: CustomerProfile): Promise<CustomerProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .upsert({
        email: customer.email,
        name: customer.name,
        phone: customer.phone || null,
        address: customer.address || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving customer:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Failed to save customer profile:', error);
    return null;
  }
};

const loadCustomerProfile = async (email: string): Promise<CustomerProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Error loading customer:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Failed to load customer profile:', error);
    return null;
  }
};

interface DeliveryRoute {
  id: string;
  driver: string;
  vehicle: string;
  zone: string;
  orders: string[];
  totalOrders: number;
  estimatedTime: string;
  startTime: string;
  endTime: string;
  status: string;
  route: Array<{
    orderId: string;
    address: string;
    customer: string;
    priority: string;
    estimatedTime: string;
  }>;
  clusterId?: string;
  totalValue?: number;
  totalCapacity?: number;
}

interface ChatMessage {
  id: string;
  order_id: string;
  sender_role: 'customer' | 'admin';
  sender_id?: string;
  content: string;
  type?: 'order' | 'support';
  created_at: string;
}

// Mock data
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'ZADA Premium Water (19L)',
    price: 500,
    stock: 150,
    minStock: 50,
    category: 'water',
    supplier: 'ZADA Water Plant',
    image: '💧',
    description: 'Premium purified water, perfect for home and office use. 19-liter bottle with easy-grip handle.',
    features: ['BPA Free', 'Purified', '19L Capacity', 'Easy Grip']
  },
  {
    id: '2',
    name: 'ZADA Water Dispenser',
    price: 25000,
    stock: 25,
    minStock: 10,
    category: 'dispenser',
    supplier: 'ZADA Equipment',
    image: '🚰',
    description: 'Modern water dispenser with hot and cold water options. Energy efficient and easy to maintain.',
    features: ['Hot & Cold', 'Energy Efficient', 'Easy Maintenance', 'Modern Design']
  },
  {
    id: '3',
    name: 'ZADA Water Filter Cartridge',
    price: 1500,
    stock: 80,
    minStock: 30,
    category: 'accessories',
    supplier: 'ZADA Filters',
    image: '🔧',
    description: 'High-quality water filter cartridge for dispensers. Removes impurities and improves taste.',
    features: ['High Quality', 'Easy Install', 'Long Lasting', 'Better Taste']
  },
  {
    id: '4',
    name: 'ZADA Sparkling Water (500ml)',
    price: 150,
    stock: 200,
    minStock: 75,
    category: 'water',
    supplier: 'ZADA Water Plant',
    image: '🥤',
    description: 'Refreshing sparkling water in convenient 500ml bottles. Perfect for on-the-go hydration.',
    features: ['Sparkling', '500ml', 'Portable', 'Refreshing']
  },
  {
    id: '5',
    name: 'ZADA Mini Dispenser',
    price: 15000,
    stock: 15,
    minStock: 8,
    category: 'dispenser',
    supplier: 'ZADA Equipment',
    image: '🪣',
    description: 'Compact water dispenser ideal for small spaces. Perfect for apartments and small offices.',
    features: ['Compact', 'Space Saving', 'Easy Use', 'Affordable']
  },
  {
    id: '6',
    name: 'ZADA Water Jug (5L)',
    price: 200,
    stock: 100,
    minStock: 40,
    category: 'accessories',
    supplier: 'ZADA Equipment',
    image: '🫙',
    description: 'Convenient 5-liter water jug with handle. Great for travel and outdoor activities.',
    features: ['5L Capacity', 'Portable', 'Durable', 'Travel Friendly']
  }
];

const mockOrders: AdminOrder[] = [
  {
    id: '1',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '+2348012345678',
    total: 500,
    status: 'pending',
    orderDate: new Date(),
    deliveryAddress: '123 Main St, Lagos',
    deliveryZone: 'Victoria Island',
    coordinates: { lat: 6.5244, lng: 3.3792 },
    orderCapacity: 1,
    priority: 'medium',
    estimatedDeliveryTime: '2:00 PM',
    clusterId: null,
    items: [{ product: mockProducts[0], quantity: 1 }],
    paymentMethod: 'cash'
  }
];

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState<'customer' | 'admin'>('customer');
  const [currentView, setCurrentView] = useState<'dashboard' | 'inventory' | 'orders' | 'delivery' | 'analytics' | 'notifications' | 'supportInbox'>('dashboard');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [orderQuantity, setOrderQuantity] = useState('1');
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [showCustomerOrderModal, setShowCustomerOrderModal] = useState(false);
  const [customerOrderDetails, setCustomerOrderDetails] = useState<any>(null);
  
  // Notification State
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [seenMessageIds, setSeenMessageIds] = useState<Set<string>>(new Set());
  
  // Enhanced Customer State
  const [customerView, setCustomerView] = useState<'home' | 'products' | 'cart' | 'orders' | 'profile'>('home');
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number; addedAt: Date }>>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [productDetails, setProductDetails] = useState<Product | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSyncNotification, setShowSyncNotification] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  // Registration/Login & Profile state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  // Customer product list UX state
  const [productSort, setProductSort] = useState<'popular' | 'price_asc' | 'price_desc'>('popular');
  const [productQtyDraft, setProductQtyDraft] = useState<Record<string, number>>({});
  
  // Admin state for products
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  
  // Admin state for orders
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  
  // Products state for customers (shared with admin)
  const [products, setProducts] = useState<Product[]>([]);
  // Admin state for delivery routes (sync with orders)
  const [adminDeliveryRoutes, setAdminDeliveryRoutes] = useState<DeliveryRoute[]>([]);
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSubscriptionRef = useRef<any>(null);
  const chatListRef = useRef<FlatList>(null as any);

  const openChatForOrder = async (orderId: string) => {
    setChatOrderId(orderId);
    setShowChat(true);
    setIsChatLoading(true);
    // Load messages
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('type', 'order')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (!error && data) setChatMessages(data as ChatMessage[]);
    setIsChatLoading(false);
    // Subscribe to realtime
    chatSubscriptionRef.current?.unsubscribe?.();
    chatSubscriptionRef.current = supabase
      .channel('messages-ch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` }, (payload: any) => {
        const msg = payload.new as ChatMessage;
        setChatMessages(prev => [...prev, msg]);
      })
      .subscribe();
  };

  const openSupportChat = async () => {
    setChatOrderId(null);
    setShowChat(true);
    setIsChatLoading(true);
    clearUnreadMessages(); // Clear unread count when opening chat
    setShowNotification(false); // Hide any visible notification
    
    // Check if Supabase is properly configured
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
      // Use local storage fallback
      console.log('Loading chat messages from local storage');
      // Support messages are global (shared between admin and customers)
      const storedMessages = await storage.getItem('@zada_support_messages') || '[]';
      const messages = JSON.parse(storedMessages);
      
      if (user?.role === 'admin') {
        // Admin sees all support messages
        const supportMessages = messages.filter((msg: any) => msg.type === 'support');
        console.log('Admin loading chat messages:', supportMessages.length, 'messages');
        setChatMessages(supportMessages);
        markMessagesAsSeen(supportMessages); // Mark all loaded messages as seen
      } else {
        // Customer sees all support messages (both their own and admin replies)
        const supportMessages = messages.filter((msg: any) => msg.type === 'support');
        console.log('Customer loading chat messages:', supportMessages.length, 'messages');
        setChatMessages(supportMessages);
        markMessagesAsSeen(supportMessages); // Mark all loaded messages as seen
      }
      
      setIsChatLoading(false);
      return;
    }
    
    if (user?.role === 'admin') {
      // Admin sees all support messages from all customers
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('type', 'support')
        .order('created_at', { ascending: true });
      if (!error && data) {
        setChatMessages(data as ChatMessage[]);
        markMessagesAsSeen(data as ChatMessage[]); // Mark all loaded messages as seen
      }
      
      // Subscribe to all support messages
      chatSubscriptionRef.current?.unsubscribe?.();
      chatSubscriptionRef.current = supabase
        .channel('admin-support-ch')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'type=eq.support' }, (payload: any) => {
          const msg = payload.new as ChatMessage;
          setChatMessages(prev => [...prev, msg]);
          
          // Show notification for new messages (not from current user)
          if (msg.sender_role !== 'admin') {
            showMessageNotification(`New message from customer: ${msg.content.substring(0, 50)}...`);
            markMessagesAsSeen([msg]); // Mark as seen to prevent re-notification
          }
        })
        .subscribe();
    } else {
      // Customer sees all support messages (both their own and admin replies)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('type', 'support')
        .order('created_at', { ascending: true });
      if (!error && data) {
        setChatMessages(data as ChatMessage[]);
        markMessagesAsSeen(data as ChatMessage[]); // Mark all loaded messages as seen
      }
      
      // Subscribe to all support messages
      chatSubscriptionRef.current?.unsubscribe?.();
      chatSubscriptionRef.current = supabase
        .channel('customer-support-ch')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'type=eq.support' }, (payload: any) => {
          const msg = payload.new as ChatMessage;
          setChatMessages(prev => [...prev, msg]);
          
          // Show notification for new messages (not from current user)
          if (msg.sender_role === 'admin') {
            showMessageNotification(`New reply from admin: ${msg.content.substring(0, 50)}...`);
            markMessagesAsSeen([msg]); // Mark as seen to prevent re-notification
          }
        })
        .subscribe();
    }
    
    setIsChatLoading(false);
  };

  const closeChat = () => {
    setShowChat(false);
    setChatOrderId(null);
    setChatMessages([]);
    chatSubscriptionRef.current?.unsubscribe?.();
  };

  // Notification Functions
  const showMessageNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setUnreadMessages(prev => prev + 1);
    
    // Auto-hide notification after 3 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  const clearUnreadMessages = () => {
    setUnreadMessages(0);
  };

  const markMessagesAsSeen = async (messages: any[]) => {
    const newSeenIds = new Set(seenMessageIds);
    messages.forEach(msg => {
      newSeenIds.add(msg.id);
    });
    setSeenMessageIds(newSeenIds);
    
    // Persist seen message IDs to storage
    try {
      const userSeenKey = getUserStorageKey(user?.id || 'anonymous', 'seen_message_ids');
      await storage.setItem(userSeenKey, JSON.stringify(Array.from(newSeenIds)));
    } catch (error) {
      console.error('Failed to save seen message IDs:', error);
    }
  };

  // Check for new messages in local storage (for fallback mode)
  const checkForNewMessages = async () => {
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
      // Support messages are global (shared between admin and customers)
      const storedMessages = await storage.getItem('@zada_support_messages') || '[]';
      const messages = JSON.parse(storedMessages);
      
      if (user?.role === 'admin') {
        // Admin gets notified of new customer messages
        const newCustomerMessages = messages.filter((msg: any) => 
          msg.type === 'support' && 
          msg.sender_role === 'customer' && 
          !seenMessageIds.has(msg.id)
        );
        
        if (newCustomerMessages.length > 0) {
          showMessageNotification(`New message from customer: ${newCustomerMessages[0].content.substring(0, 50)}...`);
          // Mark these messages as seen to prevent re-notification
          markMessagesAsSeen(newCustomerMessages);
        }
      } else {
        // Customer gets notified of new admin messages
        const newAdminMessages = messages.filter((msg: any) => 
          msg.type === 'support' && 
          msg.sender_role === 'admin' && 
          !seenMessageIds.has(msg.id)
        );
        
        if (newAdminMessages.length > 0) {
          showMessageNotification(`New reply from admin: ${newAdminMessages[0].content.substring(0, 50)}...`);
          // Mark these messages as seen to prevent re-notification
          markMessagesAsSeen(newAdminMessages);
        }
      }
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    console.log('Sending chat message:', {
      order_id: chatOrderId,
      type: chatOrderId ? 'order' : 'support',
      sender_role: user?.role,
      sender_id: user?.email,
      content: chatInput.trim()
    });
    
    const payload = {
      order_id: chatOrderId || null,
      type: chatOrderId ? 'order' : 'support',
      sender_role: (user?.role || 'customer') as 'customer' | 'admin',
      sender_id: user?.email || null,
      content: chatInput.trim(),
    } as any;
    
    try {
      // Check if Supabase is properly configured
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
        // Use local storage fallback
        console.log('Using local storage fallback for chat messages');
        const newMessage = {
          id: `local-${Date.now()}`,
          ...payload,
          created_at: new Date().toISOString(),
        };
        
        // Save to local storage (support messages are global)
        const existingMessages = await storage.getItem('@zada_support_messages') || '[]';
        const messages = JSON.parse(existingMessages);
        messages.push(newMessage);
        await storage.setItem('@zada_support_messages', JSON.stringify(messages));
        
        // Add to local state
        setChatMessages(prev => [...prev, newMessage]);
        setChatInput('');
        
        Alert.alert('Message Sent', 'Your message has been sent! (Using local storage - messages will be visible to admin when database is configured)');
        return;
      }
      
      const { data, error } = await supabase.from('messages').insert(payload);
      
      if (error) {
        console.error('Chat message error:', error);
        Alert.alert('Error', `Failed to send message: ${error.message}`);
        return;
      }
      
      console.log('Message sent successfully:', data);
      setChatInput('');
      
      // Add message to local state immediately for better UX
      const newMessage = {
        id: `temp-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, newMessage]);
      
    } catch (err) {
      console.error('Chat message exception:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // Check for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(checkForNewMessages, 5000);
    return () => clearInterval(interval);
  }, [chatMessages, user]);

  // Load seen message IDs on app start
  useEffect(() => {
    (async () => {
      if (user?.id) {
        try {
          const userSeenKey = getUserStorageKey(user.id, 'seen_message_ids');
          const storedSeenIds = await storage.getItem(userSeenKey);
          if (storedSeenIds) {
            setSeenMessageIds(new Set(JSON.parse(storedSeenIds)));
          }
        } catch (error) {
          console.error('Failed to load seen message IDs:', error);
        }
      }
    })();
  }, [user?.id]);

  // Load products for all users
  useEffect(() => {
    (async () => {
      try {
        const loadedProducts = await loadProducts();
        setProducts(loadedProducts);
        
        // Also set admin products if user is admin
        if (user?.role === 'admin') {
          setAdminProducts(loadedProducts);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    })();
  }, [user?.id]);

  // Load user-specific admin data when user logs in
  useEffect(() => {
    (async () => {
      if (user?.id && user?.role === 'admin') {
        try {
          const userData = await loadUserAdminData(user.id);
          setAdminProducts(userData.products);
          setAdminOrders(userData.orders);
        } catch (error) {
          console.error('Failed to load user admin data:', error);
        }
      }
    })();
  }, [user?.id, user?.role]);

  useEffect(() => {
    (async () => {
      const storedUsers = await loadUsersFromStorage();
      if (!storedUsers || storedUsers.length === 0) {
        const seeded: AppUser[] = [
          { id: 'admin-1', name: 'Admin User', email: 'admin@zada.com', password: 'admin', role: 'admin' },
          { id: 'cust-1', name: 'Customer User', email: 'customer@zada.com', password: 'customer', role: 'customer', phone: '', address: '' },
        ];
        await saveUsersToStorage(seeded);
        setUsers(seeded);
      } else {
        setUsers(storedUsers);
      }
      const current = await loadCurrentUser();
      console.log('Loaded current user:', current);
      if (current) {
        setUser(current);
        setProfileName(current.name || '');
        setProfileEmail(current.email || '');
        setProfilePhone(current.phone || '');
        setProfileAddress(current.address || '');
      } else {
        console.log('No current user found, showing login screen');
      }
    })();
  }, []);

  const handleLogin = async () => {
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (found) {
      setUser(found);
      await saveCurrentUser(found);
      setProfileName(found.name || '');
      setProfileEmail(found.email || '');
      setProfilePhone(found.phone || '');
      setProfileAddress(found.address || '');
      return;
    }
    if (email === 'admin@zada.com' && password === 'admin') {
      const demo = { id: 'admin-1', name: 'Admin User', email, password, role: 'admin' as const };
      setUser(demo);
      await saveCurrentUser(demo);
      return;
    }
    if (email === 'customer@zada.com' && password === 'customer') {
      const demo = { id: 'cust-1', name: 'Customer User', email, password, role: 'customer' as const, phone: '', address: '' };
      setUser(demo);
      await saveCurrentUser(demo);
      setProfileName(demo.name);
      setProfileEmail(demo.email);
      setProfilePhone(demo.phone || '');
      setProfileAddress(demo.address || '');
      return;
    }
    Alert.alert('Error', 'Invalid credentials');
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      Alert.alert('Missing info', 'Please enter name, email and password');
      return;
    }

    const emailTaken = users.some(u => u.email.toLowerCase() === regEmail.toLowerCase());
    if (emailTaken) {
      Alert.alert('Email in use', 'An account with this email already exists');
      return;
    }

    const newUser: AppUser = {
      id: `user-${Date.now()}`,
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
      role: registerRole, // Use selected role
      phone: regPhone.trim(),
      address: regAddress.trim(),
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    await saveUsersToStorage(updatedUsers);
    setUser(newUser);
    await saveCurrentUser(newUser);
    setProfileName(newUser.name);
    setProfileEmail(newUser.email);
    setProfilePhone(newUser.phone);
    setProfileAddress(newUser.address);
    setIsRegisterMode(false);
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegPhone('');
    setRegAddress('');
    Alert.alert('Success', `Account created successfully! Welcome, ${newUser.name}!`);
  };

  const handleLogout = () => {
    setUser(null);
    saveCurrentUser(null);
    setEmail('');
    setPassword('');
    // Clear cart and other customer data on logout
    setCart([]);
    setCustomerView('home');
    setShowCart(false);
    setShowCheckout(false);
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 2000);
  }, []);

  // Customer Order Functions
  const handleCustomerOrder = (product: any) => {
    setSelectedProduct(product);
    setShowCustomerOrderModal(true);
  };

  const submitCustomerOrder = async () => {
    if (!orderQuantity || parseInt(orderQuantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const newOrder: CustomerOrder = {
      id: Date.now().toString(),
      product: selectedProduct,
      quantity: parseInt(orderQuantity),
      total: selectedProduct.price * parseInt(orderQuantity),
      status: 'pending',
      orderDate: new Date(),
      notes: orderNotes,
      paymentMethod: selectedPaymentMethod,
      customerName: user.name,
      customerEmail: user.email,
    };

    try {
      // Sync order to admin system
      const syncResult = syncCustomerOrderToAdmin(newOrder);
      
      // Update customer orders
      setCustomerOrders([...customerOrders, newOrder]);
      
      // Update admin orders
      const updatedAdminOrders = [...adminOrders, syncResult.adminOrder];
      setAdminOrders(updatedAdminOrders);
      
      // Save to user-specific storage
      if (user?.id) {
        await saveUserAdminData(user.id, adminProducts, updatedAdminOrders);
      }
      
      // Update inventory
      const updatedProducts = updateInventoryFromOrder(newOrder, adminProducts);
      setAdminProducts(updatedProducts);
      
      // Save updated products to user-specific storage
      if (user?.id) {
        await saveUserAdminData(user.id, updatedProducts, updatedAdminOrders);
      }
      
      setShowCustomerOrderModal(false);
      setOrderQuantity('1');
      setOrderNotes('');
      setSelectedPaymentMethod('cash');
      
      Alert.alert(
        'Order Placed Successfully! 🎉',
        `Your order for ${orderQuantity} ${selectedProduct.name} has been placed and synced to our system.\n\nTotal: ₦${newOrder.total.toLocaleString()}\n\nOrder ID: #${newOrder.id}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to place order. Please try again.');
      console.error('Order placement error:', error);
    }
  };

  // Enhanced Cart Functions with Better Error Handling
  const addToCart = (product: Product, quantity: number = 1) => {
    try {
      if (!product || !product.id) {
        Alert.alert('Error', 'Invalid product information');
        return;
      }

      if (quantity <= 0) {
        Alert.alert('Error', 'Quantity must be greater than 0');
        return;
      }

      if (product.stock < quantity) {
        Alert.alert('Error', `Only ${product.stock} items available in stock`);
        return;
      }

      const existingItem = cart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          Alert.alert('Error', `Cannot add ${quantity} more items. Only ${product.stock - existingItem.quantity} available.`);
          return;
        }
        
        setCart(cart.map(item =>
          item.product.id === product.id 
            ? { ...item, quantity: newQuantity }
            : item
        ));
      } else {
        setCart([...cart, { product, quantity, addedAt: new Date() }]);
      }
      
      Alert.alert('Added to Cart', `${product.name} added to cart!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
      console.error('Add to cart error:', error);
    }
  };

  const removeFromCart = (productId: string) => {
    try {
      setCart(cart.filter(item => item.product.id !== productId));
    } catch (error) {
      console.error('Remove from cart error:', error);
    }
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    try {
      if (newQuantity <= 0) {
        removeFromCart(productId);
      } else {
        const cartItem = cart.find(item => item.product.id === productId);
        if (cartItem && newQuantity > cartItem.product.stock) {
          Alert.alert('Error', `Only ${cartItem.product.stock} items available in stock`);
          return;
        }
        
        setCart(cart.map(item => 
          item.product.id === productId 
            ? { ...item, quantity: newQuantity }
            : item
        ));
      }
    } catch (error) {
      console.error('Update cart quantity error:', error);
    }
  };

  const getCartTotal = () => {
    try {
      return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    } catch (error) {
      console.error('Get cart total error:', error);
      return 0;
    }
  };

  const getCartItemCount = () => {
    try {
      return cart.reduce((count, item) => count + item.quantity, 0);
    } catch (error) {
      console.error('Get cart item count error:', error);
      return 0;
    }
  };

  const proceedToCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart first.');
      return;
    }
    
    // Load customer profile from database if available
    if (user?.email && user.role === 'customer') {
      const customerProfile = await loadCustomerProfile(user.email);
      if (customerProfile) {
        if (customerProfile.address && !deliveryAddress) setDeliveryAddress(customerProfile.address);
        if (customerProfile.phone && !deliveryPhone) setDeliveryPhone(customerProfile.phone);
      }
    }
    
    // Fallback to local user data
    if (user) {
      if ((user as any).address && !deliveryAddress) setDeliveryAddress((user as any).address);
      if ((user as any).phone && !deliveryPhone) setDeliveryPhone((user as any).phone);
    }
    setShowCheckout(true);
  };

  const placeOrderFromCart = async () => {
    try {
      if (!deliveryAddress || !deliveryAddress.trim()) {
        Alert.alert('Missing Information', 'Please provide delivery address.');
        return;
      }

      if (!deliveryPhone || !deliveryPhone.trim()) {
        Alert.alert('Missing Information', 'Please provide phone number.');
        return;
      }

      if (cart.length === 0) {
        Alert.alert('Empty Cart', 'Your cart is empty.');
        return;
      }

      const newOrder: CustomerOrder = {
        id: Date.now().toString(),
        items: cart,
        total: getCartTotal(),
        status: 'pending',
        orderDate: new Date(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryPhone: deliveryPhone.trim(),
        paymentMethod: selectedPaymentMethod,
        customerName: user.name,
        customerEmail: user.email,
      };

      // Save customer profile to database for future orders
      if (user?.role === 'customer') {
        await saveCustomerProfile({
          email: user.email,
          name: user.name,
          phone: deliveryPhone.trim(),
          address: deliveryAddress.trim(),
        });
      }

      // Sync order to admin system
      const syncResult = syncCustomerOrderToAdmin(newOrder);
      
      // Update customer orders
      setCustomerOrders([...customerOrders, newOrder]);
      
      // Update admin orders state (in addition to mock list for legacy usage)
      const nextAdminOrders = [...adminOrders, syncResult.adminOrder];
      setAdminOrders(nextAdminOrders);
      // If order is confirmed immediately, push to delivery route. Otherwise will be synced when status changes
      if (syncResult.adminOrder.status === 'out_for_delivery') {
        setAdminDeliveryRoutes(prev => {
          const existing = prev.find(r => r.zone === syncResult.adminOrder.deliveryZone && r.status !== 'completed');
          if (existing) {
            const updated = { ...existing, orders: [...existing.orders, syncResult.adminOrder.id], totalOrders: existing.totalOrders + 1 };
            return prev.map(r => r.id === existing.id ? updated : r);
          }
          const newRoute: DeliveryRoute = {
            id: `route-${Date.now()}`,
            driver: 'Unassigned',
            vehicle: 'TBD',
            zone: syncResult.adminOrder.deliveryZone,
            orders: [syncResult.adminOrder.id],
            totalOrders: 1,
            estimatedTime: '60 min',
            startTime: 'Now',
            endTime: 'TBD',
            status: 'in_progress',
            route: [{ orderId: syncResult.adminOrder.id, address: syncResult.adminOrder.deliveryAddress, customer: syncResult.adminOrder.customerName, priority: syncResult.adminOrder.priority, estimatedTime: 'TBD' }],
            clusterId: syncResult.adminOrder.clusterId || undefined,
            totalValue: syncResult.adminOrder.total,
            totalCapacity: syncResult.adminOrder.orderCapacity,
          };
          return [...prev, newRoute];
        });
      }
      
      // Update inventory in admin product state
      setAdminProducts(syncResult.updatedMockProducts);
      
      // Clear cart and close checkout
      setCart([]);
      setShowCheckout(false);
      setDeliveryAddress('');
      setDeliveryPhone('');
      
      Alert.alert(
        'Order Placed Successfully! 🎉',
        `Your order for ${cart.length} items has been placed and synced to our system.\n\nTotal: ₦${getCartTotal().toLocaleString()}\n\nOrder ID: #${newOrder.id}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to place order. Please try again.');
      console.error('Place order error:', error);
    }
  };

  const openProductDetails = (product: any) => {
    setProductDetails(product);
    setShowProductDetails(true);
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedFilteredProducts = [...filteredProducts].sort((a, b) => {
    if (productSort === 'price_asc') return a.price - b.price;
    if (productSort === 'price_desc') return b.price - a.price;
    return b.stock - a.stock; // default: popular proxy
  });

  // Helper functions for product display
  const getProductImageColor = (category: string) => {
    switch (category) {
      case 'water': return '#E0F2FE';
      case 'dispenser': return '#F0FDF4';
      case 'accessories': return '#FEF3C7';
      default: return '#F3F4F6';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'water': return '#0EA5E9';
      case 'dispenser': return '#10B981';
      case 'accessories': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  // Admin Functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#3B82F6';
      case 'out_for_delivery': return '#8B5CF6';
      case 'delivered': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Enhanced Order Status Update with Customer Sync
  const updateOrderStatus = (orderId: string, newStatus: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered') => {
    // Update admin orders
    const updatedAdminOrders = adminOrders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    
    // Update the admin orders state to reflect changes in the UI
    setAdminOrders(updatedAdminOrders);
    
    // Update customer orders if they exist
    const updatedCustomerOrders = customerOrders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    
    // In a real app, this would be an API call
    // For now, we'll update the local state
    setCustomerOrders(updatedCustomerOrders);
    
    // Show success message
    Alert.alert('Success', `Order status updated to ${newStatus}`);
    
    // Keep delivery routes in sync: when moving to out_for_delivery, attach to a route; when delivered, remove
    const targetOrder = updatedAdminOrders.find(o => o.id === orderId);
    if (targetOrder) {
      if (newStatus === 'out_for_delivery') {
        // Simple sync: ensure a route exists per zone and append order
        setAdminDeliveryRoutes(prev => {
          const existing = prev.find(r => r.zone === targetOrder.deliveryZone && r.status !== 'completed');
          if (existing) {
            const updated = { ...existing, orders: [...existing.orders, targetOrder.id], totalOrders: existing.totalOrders + 1 };
            return prev.map(r => r.id === existing.id ? updated : r);
          }
          const newRoute: DeliveryRoute = {
            id: `route-${Date.now()}`,
            driver: 'Unassigned',
            vehicle: 'TBD',
            zone: targetOrder.deliveryZone,
            orders: [targetOrder.id],
            totalOrders: 1,
            estimatedTime: '60 min',
            startTime: 'Now',
            endTime: 'TBD',
            status: 'in_progress',
            route: [{ orderId: targetOrder.id, address: targetOrder.deliveryAddress, customer: targetOrder.customerName, priority: targetOrder.priority, estimatedTime: 'TBD' }],
            clusterId: targetOrder.clusterId || undefined,
            totalValue: targetOrder.total,
            totalCapacity: targetOrder.orderCapacity,
          };
          return [...prev, newRoute];
        });
      }
      if (newStatus === 'delivered') {
        setAdminDeliveryRoutes(prev => prev.map(r => ({
          ...r,
          orders: r.orders.filter(id => id !== orderId),
          totalOrders: r.orders.includes(orderId) ? Math.max(0, r.totalOrders - 1) : r.totalOrders,
          route: r.route.filter(s => s.orderId !== orderId),
          status: r.orders.length === 1 && r.orders[0] === orderId ? 'completed' : r.status,
        })));
      }
    }
  };

  // Enhanced Order Update Function
  const updateOrderDetails = (orderId: string, updates: Partial<AdminOrder>) => {
    const updatedAdminOrders = adminOrders.map(order => 
      order.id === orderId ? { ...order, ...updates } : order
    );
    
    // Update the admin orders state to reflect changes in the UI
    setAdminOrders(updatedAdminOrders);
    
    // Update customer orders if they exist
    const updatedCustomerOrders = customerOrders.map(order => 
      order.id === orderId ? { ...order, ...updates } : order
    );
    
    setCustomerOrders(updatedCustomerOrders);
    Alert.alert('Success', 'Order details updated successfully');
  };

  // Inventory Management Functions
  const updateProductDetails = async (productId: string, updates: Partial<Product>) => {
    const updatedProducts = products.map(product => 
      product.id === productId ? { ...product, ...updates } : product
    );
    
    // Update both products and adminProducts
    setProducts(updatedProducts);
    setAdminProducts(updatedProducts);
    
    // Save to storage
    await saveProducts(updatedProducts);
    
    // Save to user-specific admin data
    if (user?.id) {
      await saveUserAdminData(user.id, updatedProducts, adminOrders);
    }
    
    Alert.alert('Success', 'Product details updated successfully');
  };

  const addNewProduct = async (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: (products.length + 1).toString()
    };
    
    // Update both products and adminProducts
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    setAdminProducts(updatedProducts);
    
    // Save to storage
    await saveProducts(updatedProducts);
    
    // Save to user-specific admin data
    if (user?.id) {
      await saveUserAdminData(user.id, updatedProducts, adminOrders);
    }
    
    Alert.alert('Success', 'New product added successfully');
  };

  const deleteProduct = async (productId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            // Remove from both products and adminProducts
            const updatedProducts = products.filter(product => product.id !== productId);
            setProducts(updatedProducts);
            setAdminProducts(updatedProducts);
            
            // Save to storage
            await saveProducts(updatedProducts);
            
            // Save to user-specific admin data
            if (user?.id) {
              await saveUserAdminData(user.id, updatedProducts, adminOrders);
            }
            
            Alert.alert('Success', 'Product deleted successfully');
          }
        }
      ]
    );
  };

  // Driver Assignment Function
  const assignDriverToOrder = (orderId: string, driverId: string) => {
    const driver = mockDrivers.find(d => d.id === driverId);
    if (driver) {
      updateOrderDetails(orderId, { 
        clusterId: `driver-${driverId}`,
        estimatedDeliveryTime: '30 minutes'
      });
      Alert.alert('Driver Assigned', `Driver ${driver.name} assigned to order ${orderId}`);
    }
  };

  // Sync Functions - Connect Customer & Admin Ecosystems
  const syncCustomerOrderToAdmin = (order: CustomerOrder): { adminOrder: AdminOrder; updatedMockOrders: AdminOrder[]; updatedMockProducts: Product[] } => {
    try {
      // Add order to admin orders list
      const adminOrder: AdminOrder = {
        id: order.id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.deliveryPhone || 'N/A',
        total: order.total,
        status: order.status,
        orderDate: order.orderDate,
        deliveryAddress: order.deliveryAddress || 'N/A',
        deliveryZone: 'Customer Zone', // Will be updated with actual zone
        coordinates: { lat: 6.5244, lng: 3.3792 }, // Default Lagos coordinates
        orderCapacity: order.items ? order.items.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0) : 1,
        priority: 'medium',
        estimatedDeliveryTime: '2:00 PM',
        clusterId: null,
        items: order.items || (order.product ? [{ product: order.product, quantity: order.quantity || 1 }] : []),
        paymentMethod: order.paymentMethod,
        notes: order.notes || ''
      };

      // Update mockOrders array (admin orders)
      const updatedMockOrders = [...mockOrders, adminOrder];
      
      // Update inventory based on order
      const updatedMockProducts = mockProducts.map(product => {
        const orderItem = order.items ? 
          order.items.find((item: any) => item.product.id === product.id) :
          (order.product && order.product.id === product.id ? { quantity: order.quantity } : null);
        
        if (orderItem) {
          return {
            ...product,
            stock: Math.max(0, product.stock - (orderItem.quantity || 1))
          };
        }
        return product;
      });

      // Update state (in a real app, this would be API calls)
      // For now, we'll use a global state update approach
      return { adminOrder, updatedMockOrders, updatedMockProducts };
    } catch (error) {
      console.error('Sync customer order error:', error);
      throw error;
    }
  };

  const updateInventoryFromOrder = (order: CustomerOrder, products: Product[]): Product[] => {
    try {
      // Update product stock levels
      const updatedProducts = products.map(product => {
        const orderItem = order.items ? 
          order.items.find((item: OrderItem) => item.product.id === product.id) :
          (order.product && order.product.id === product.id ? { quantity: order.quantity || 1 } : null);
        
        if (orderItem) {
          return {
            ...product,
            stock: Math.max(0, product.stock - (orderItem.quantity || 1))
          };
        }
        return product;
      });

      return updatedProducts;
    } catch (error) {
      console.error('Update inventory error:', error);
      return products;
    }
  };

  // Refresh customer orders from admin updates
  const refreshCustomerOrders = () => {
    try {
      // Find orders that exist in both admin and customer systems
      const updatedCustomerOrders = customerOrders.map(customerOrder => {
        const adminOrder = adminOrders.find(adminOrder => adminOrder.id === customerOrder.id);
        if (adminOrder) {
          return {
            ...customerOrder,
            status: adminOrder.status // Sync status from admin
          };
        }
        return customerOrder;
      });
      
      setCustomerOrders(updatedCustomerOrders);
      setLastSyncTime(new Date());
      
      // Show sync notification
      setSyncMessage('Order statuses refreshed from admin system! 🔄');
      setShowSyncNotification(true);
    } catch (error) {
      console.error('Refresh customer orders error:', error);
      Alert.alert('Error', 'Failed to refresh orders. Please try again.');
    }
  };

  const getLowStockProducts = () => {
    return adminProducts.filter(product => product.stock <= product.minStock);
  };

  // Mock data for admin dashboard
  const mockAnalytics = {
    totalRevenue: adminOrders.reduce((total, order) => total + order.total, 0),
    totalOrders: adminOrders.length,
    totalCustomers: 856,
    pendingDeliveries: adminOrders.filter(order => order.status === 'pending' || order.status === 'confirmed').length,
    deliveryZones: ['Victoria Island', 'Lekki', 'Ikeja', 'Surulere', 'Yaba'],
    zonePerformance: {
      'Victoria Island': { orders: 456, revenue: 890000, growth: 12.5 },
      'Lekki': { orders: 389, revenue: 720000, growth: 8.3 },
      'Ikeja': { orders: 234, revenue: 450000, growth: 15.7 },
      'Surulere': { orders: 89, revenue: 180000, growth: 5.2 },
      'Yaba': { orders: 66, revenue: 210000, growth: 22.1 }
    }
  };

  const mockDrivers = [
    { id: '1', name: 'John Driver', phone: '+2348012345678', vehicle: 'Truck A', status: 'available', currentZone: 'Victoria Island', rating: 4.8, deliveriesToday: 12 },
    { id: '2', name: 'Sarah Rider', phone: '+2348012345679', vehicle: 'Van B', status: 'on_delivery', currentZone: 'Lekki', rating: 4.9, deliveriesToday: 8 },
    { id: '3', name: 'Mike Walker', phone: '+2348012345680', vehicle: 'Truck C', status: 'available', currentZone: 'Ikeja', rating: 4.7, deliveriesToday: 15 },
    { id: '4', name: 'Lisa Carrier', phone: '+2348012345681', vehicle: 'Van D', status: 'on_delivery', currentZone: 'Surulere', rating: 4.6, deliveriesToday: 10 }
  ];

  const mockDeliveryRoutes: DeliveryRoute[] = [
    {
      id: '1',
      driver: 'John Driver',
      vehicle: 'Truck A',
      zone: 'Victoria Island',
      orders: ['1'],
      totalOrders: 1,
      estimatedTime: '2.5 hours',
      startTime: '9:00 AM',
      endTime: '11:30 AM',
      status: 'in_progress',
      clusterId: 'VI-001',
      totalValue: 500,
      totalCapacity: 1,
      route: [
        { orderId: '1', address: '123 Main St, Victoria Island', customer: 'John Doe', priority: 'medium', estimatedTime: '9:30 AM' }
      ]
    }
  ];

  const getRevenueGrowth = (zone: string) => {
    const zoneData = mockAnalytics.zonePerformance[zone as keyof typeof mockAnalytics.zonePerformance];
    return zoneData ? zoneData.growth : 0;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#3B82F6';
      case 'out_for_delivery': return '#8B5CF6';
      case 'delivered': return '#10B981';
      default: return '#6B7280';
    }
  };

  const mockDeliverySchedule = [
    { time: '9:00 AM', zone: 'Victoria Island', driver: 'John Driver', orders: 2, status: 'in_progress' },
    { time: '10:00 AM', zone: 'Lekki', driver: 'Sarah Rider', orders: 1, status: 'completed' },
    { time: '11:00 AM', zone: 'Ikeja', driver: 'Mike Walker', orders: 3, status: 'scheduled' },
    { time: '12:00 PM', zone: 'Surulere', driver: 'Lisa Carrier', orders: 2, status: 'scheduled' },
    { time: '1:00 PM', zone: 'Yaba', driver: 'John Driver', orders: 4, status: 'pending' }
  ];

  // Delivery Management Functions
  const getDriverStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10B981';
      case 'on_delivery': return '#F59E0B';
      case 'offline': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getRouteStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#3B82F6';
      case 'in_progress': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'pending': return '#6B7280';
      default: return '#6B7280';
    }
  };



  const optimizeDeliveryRoute = (zone: string) => {
    const zoneOrders = adminOrders.filter(o => o.deliveryZone === zone && o.status === 'confirmed');
    if (zoneOrders.length > 0) {
      Alert.alert('Route Optimized', `Optimized route for ${zone} with ${zoneOrders.length} orders. Estimated time: ${zoneOrders.length * 0.5} hours`);
    } else {
      Alert.alert('No Orders', `No confirmed orders in ${zone} to optimize`);
    }
  };

  const updateDeliveryStatus = (routeId: string, newStatus: string) => {
    setAdminDeliveryRoutes(prev => prev.map(r => r.id === routeId ? { ...r, status: newStatus } : r));
    Alert.alert('Status Updated', `Delivery route ${routeId} status changed to ${newStatus}`);
  };

  // Backend Order Clustering Logic
  const calculateDistance = (coord1: { lat: number, lng: number }, coord2: { lat: number, lng: number }): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const clusterOrdersByProximity = (orders: any[], maxDistance: number = 2.0): any[] => {
    const confirmedOrders = orders.filter(order => order.status === 'confirmed');
    const clusters: any[] = [];
    let clusterId = 1;

    // Reset cluster IDs
    confirmedOrders.forEach(order => order.clusterId = null);

    confirmedOrders.forEach(order => {
      if (order.clusterId) return; // Already clustered

      const cluster = {
        id: clusterId,
        orders: [order],
        center: { ...order.coordinates },
        totalCapacity: order.orderCapacity,
        totalValue: order.total,
        zone: order.deliveryZone,
        priority: order.priority
      };

      order.clusterId = clusterId;

      // Find nearby orders to add to this cluster
      confirmedOrders.forEach(otherOrder => {
        if (otherOrder.id === order.id || otherOrder.clusterId) return;

        const distance = calculateDistance(order.coordinates, otherOrder.coordinates);
        if (distance <= maxDistance) {
          // Check if adding this order would exceed vehicle capacity (assuming 50L max)
          if (cluster.totalCapacity + otherOrder.orderCapacity <= 50) {
            cluster.orders.push(otherOrder);
            otherOrder.clusterId = clusterId;
            cluster.totalCapacity += otherOrder.orderCapacity;
            cluster.totalValue += otherOrder.total;
            
            // Update cluster center (average of all coordinates)
            cluster.center.lat = cluster.orders.reduce((sum, o) => sum + o.coordinates.lat, 0) / cluster.orders.length;
            cluster.center.lng = cluster.orders.reduce((sum, o) => sum + o.coordinates.lng, 0) / cluster.orders.length;
          }
        }
      });

      clusters.push(cluster);
      clusterId++;
    });

    return clusters;
  };

  const generateOptimizedRoutes = (clusters: any[]): any[] => {
    return clusters.map(cluster => {
      // Sort orders within cluster by priority and distance from center
      const sortedOrders = cluster.orders.sort((a: any, b: any) => {
        // Priority first (high > medium > low)
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority as keyof typeof priorityOrder] !== priorityOrder[b.priority as keyof typeof priorityOrder]) {
          return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
        }
        
        // Then by distance from cluster center
        const distA = calculateDistance(a.coordinates, cluster.center);
        const distB = calculateDistance(b.coordinates, cluster.center);
        return distA - distB;
      });

      // Calculate estimated delivery time (30 min per order + travel time)
      const baseTime = sortedOrders.length * 30; // 30 minutes per order
      const totalDistance = sortedOrders.reduce((total: number, order: any, index: number) => {
        if (index === 0) return 0;
        return total + calculateDistance(sortedOrders[index - 1].coordinates, order.coordinates);
      }, 0);
      const travelTime = totalDistance * 20; // 20 minutes per km
      const estimatedTime = baseTime + travelTime;

      return {
        id: `route-${cluster.id}`,
        clusterId: cluster.id,
        driver: null, // Will be assigned later
        vehicle: null,
        zone: cluster.zone,
        orders: sortedOrders.map((o: any) => o.id),
        totalOrders: sortedOrders.length,
        estimatedTime: `${Math.round(estimatedTime)} min`,
        startTime: '9:00 AM', // Will be calculated based on driver availability
        endTime: '12:00 PM', // Will be calculated based on start time + estimated time
        status: 'scheduled',
        route: sortedOrders.map((order: any, index: number) => ({
          orderId: order.id,
          address: order.deliveryAddress,
          customer: order.customerName,
          priority: order.priority,
          estimatedTime: `${Math.floor(9 + (index * 0.5))}:${index % 2 === 0 ? '00' : '30'} AM`,
          coordinates: order.coordinates
        })),
        totalCapacity: cluster.totalCapacity,
        totalValue: cluster.totalValue,
        center: cluster.center
      };
    });
  };

  const autoClusterOrders = () => {
    const clusters = clusterOrdersByProximity(adminOrders, 2.0); // 2km radius
    const optimizedRoutes = generateOptimizedRoutes(clusters);
    
    // Update delivery routes state
    setAdminDeliveryRoutes(optimizedRoutes);
    
    Alert.alert(
      'Orders Clustered Successfully!',
      `Created ${clusters.length} delivery clusters from ${clusters.reduce((sum, c) => sum + c.orders.length, 0)} orders.\n\nEstimated time savings: ${Math.round(clusters.reduce((sum, c) => sum + (c.orders.length - 1) * 0.5, 0))} hours`
    );
    
    return { clusters, routes: optimizedRoutes };
  };



  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.loginCard}>
          <Text style={styles.title}>ZADA</Text>
          <Text style={styles.subtitle}>Pure Water Manufacturing</Text>
          {isRegisterMode ? (
            <>
              <TextInput style={styles.input} placeholder="Full Name" value={regName} onChangeText={setRegName} />
              <TextInput style={styles.input} placeholder="Email" value={regEmail} onChangeText={setRegEmail} keyboardType="email-address" />
              <TextInput style={styles.input} placeholder="Password" value={regPassword} onChangeText={setRegPassword} secureTextEntry />
              
              {/* Role Selection */}
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
              </View>
              
              <TextInput style={styles.input} placeholder="Phone (optional)" value={regPhone} onChangeText={setRegPhone} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="Address (optional)" value={regAddress} onChangeText={setRegAddress} />
              <TouchableOpacity style={styles.loginButton} onPress={handleRegister}>
                <Text style={styles.loginButtonText}>Register</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.switchAuth} onPress={() => setIsRegisterMode(false)}>
                <Text style={styles.switchAuthText}>Back to sign in</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.switchAuth} onPress={() => setIsRegisterMode(true)}>
                <Text style={styles.switchAuthText}>Create an account</Text>
              </TouchableOpacity>
              <View style={styles.demoCredentials}>
                <Text style={styles.demoTitle}>Demo Credentials:</Text>
                <Text style={styles.demoText}>Admin: admin@zada.com / admin</Text>
                <Text style={styles.demoText}>Customer: customer@zada.com / customer</Text>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>
            Welcome, {user.name}!
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.supportButton} 
              onPress={openSupportChat}
            >
              <Text style={styles.supportButtonText}>
                {user.role === 'admin' ? '📞 Support Inbox' : '💬 Support'}
              </Text>
              {unreadMessages > 0 && (
                <View style={styles.supportUnreadBadge}>
                  <Text style={styles.supportUnreadText}>{unreadMessages}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Notification Banner */}
      {showNotification && (
        <TouchableOpacity 
          style={styles.notificationBanner}
          onPress={() => {
            setShowNotification(false);
            clearUnreadMessages();
            openSupportChat();
          }}
          activeOpacity={0.8}
        >
          <View style={styles.notificationContent}>
            <Text style={styles.notificationIcon}>🔔</Text>
            <Text style={styles.notificationText}>
              {notificationMessage}
              <Text style={styles.notificationTapHint}> • Tap to open</Text>
            </Text>
            <TouchableOpacity 
              style={styles.notificationClose}
              onPress={(e) => {
                e.stopPropagation();
                setShowNotification(false);
              }}
            >
              <Text style={styles.notificationCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}


              {user.role === 'admin' && (
          <View style={styles.adminNav}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['dashboard', 'inventory', 'orders', 'delivery', 'analytics', 'notifications', 'supportInbox'] as const).map((view) => (
                <TouchableOpacity
                  key={view}
                  style={[styles.navButton, currentView === view && styles.activeNavButton]}
                  onPress={() => setCurrentView(view)}
                >
                  <Text style={[styles.navButtonText, currentView === view && styles.activeNavButtonText]}>
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {user.role === 'customer' && (
          <View style={styles.customerNav}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['home', 'products', 'cart', 'orders', 'profile'] as const).map((view) => (
                <TouchableOpacity
                  key={view}
                  style={[styles.navButton, customerView === view && styles.activeNavButton]}
                  onPress={() => setCustomerView(view)}
                >
                  <Text style={[styles.navButtonText, customerView === view && styles.activeNavButtonText]}>
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.cartButton}
              onPress={() => setShowCart(true)}
            >
              <Text style={styles.cartButtonText}>🛒 {getCartItemCount()}</Text>
            </TouchableOpacity>
          </View>
        )}

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content} 
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {user.role === 'admin' ? (
          // Admin Views
          <>
            {currentView === 'dashboard' && (
              <View style={styles.adminContent}>
                {/* Sync Status Indicator */}
                <View style={styles.syncStatusCard}>
                  <View style={styles.syncStatusHeader}>
                    <Text style={styles.syncStatusIcon}>🔄</Text>
                    <Text style={styles.syncStatusTitle}>Real-time Sync Active</Text>
                  </View>
                  <Text style={styles.syncStatusSubtitle}>Customer orders automatically appear in admin dashboard</Text>
                  <View style={styles.syncStats}>
                    <View style={styles.syncStat}>
                      <Text style={styles.syncStatNumber}>{adminOrders.length}</Text>
                      <Text style={styles.syncStatLabel}>Total Orders</Text>
                    </View>
                    <View style={styles.syncStat}>
                      <Text style={styles.syncStatNumber}>{adminProducts.length}</Text>
                      <Text style={styles.syncStatLabel}>Products</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statTitle}>Total Revenue</Text>
                  <Text style={styles.statValue}>₦{(mockAnalytics.totalRevenue / 1000000).toFixed(1)}M</Text>
                  <Text style={styles.statGrowth}>+12.5% this month</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statTitle}>Total Orders</Text>
                  <Text style={styles.statValue}>{mockAnalytics.totalOrders.toLocaleString()}</Text>
                  <Text style={styles.statGrowth}>+8.3% this month</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statTitle}>Active Customers</Text>
                  <Text style={styles.statValue}>{mockAnalytics.totalCustomers.toLocaleString()}</Text>
                  <Text style={styles.statGrowth}>+15.7% this month</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statTitle}>Pending Deliveries</Text>
                  <Text style={styles.statValue}>{mockAnalytics.pendingDeliveries}</Text>
                  <Text style={styles.statGrowth}>Requires attention</Text>
                </View>

                {/* Recent Customer Orders */}
                <View style={styles.recentOrdersCard}>
                  <Text style={styles.cardTitle}>Recent Customer Orders</Text>
                  <Text style={styles.cardSubtitle}>Live updates from customer app</Text>
                  
                  {adminOrders.slice(-3).reverse().map((order, index) => (
                    <View key={order.id} style={styles.recentOrderItem}>
                      <View style={styles.recentOrderHeader}>
                        <View style={styles.recentOrderInfo}>
                          <Text style={styles.recentOrderCustomer}>{order.customerName}</Text>
                          <Text style={styles.recentOrderEmail}>{order.customerEmail}</Text>
                        </View>
                        <View style={[styles.recentOrderStatus, { backgroundColor: getStatusColor(order.status) }]}>
                          <Text style={styles.recentOrderStatusText}>{order.status.toUpperCase()}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.recentOrderDetails}>
                        <Text style={styles.recentOrderItems}>
                          {order.items ? `${order.items.length} items` : 'Single item order'}
                        </Text>
                        <Text style={styles.recentOrderTotal}>₦{order.total.toLocaleString()}</Text>
                      </View>
                      
                      <View style={styles.recentOrderMeta}>
                        <Text style={styles.recentOrderDate}>
                          📅 {order.orderDate.toLocaleDateString()}
                        </Text>
                        <Text style={styles.recentOrderTime}>
                          🕐 {order.orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={styles.recentOrderAddress}>
                          📍 {order.deliveryAddress || 'Address not provided'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.fullWidthCard}>
                  <Text style={styles.cardTitle}>Low Stock Alerts</Text>
                  {getLowStockProducts().map(product => (
                    <View key={product.id} style={styles.alertItem}>
                      <Text style={styles.alertText}>{product.name}</Text>
                      <Text style={styles.alertStock}>Stock: {product.stock} (Min: {product.minStock})</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {currentView === 'inventory' && (
              <View style={styles.inventoryView}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Inventory Management</Text>
                  <Text style={styles.sectionSubtitle}>Edit product details, stock levels, and pricing</Text>
                </View>
                
                {/* Add New Product Button */}
                <TouchableOpacity 
                  style={styles.addProductButton}
                  onPress={() => {
                    Alert.prompt(
                      'Add New Product',
                      'Enter product name:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Add', 
                          onPress: (productName) => {
                            if (productName) {
                              addNewProduct({
                                name: productName,
                                price: 0,
                                stock: 0,
                                minStock: 10,
                                category: 'accessories',
                                supplier: 'ZADA Equipment',
                                image: '📦',
                                description: 'New product description',
                                features: ['New', 'Quality', 'Affordable']
                              });
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.addProductButtonText}>➕ Add New Product</Text>
                </TouchableOpacity>

                {adminProducts.map(product => (
                  <View key={product.id} style={styles.inventoryCard}>
                    <View style={styles.inventoryHeader}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <View style={[styles.stockIndicator, { backgroundColor: product.stock <= product.minStock ? '#EF4444' : '#10B981' }]}>
                        <Text style={styles.productStockText}>{product.stock}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.inventoryDetails}>
                      <Text style={styles.supplierText}>Supplier: {product.supplier}</Text>
                      <Text style={styles.priceText}>Price: ₦{product.price.toLocaleString()}</Text>
                      <Text style={styles.categoryText}>Category: {product.category}</Text>
                      <Text style={styles.minStockText}>Min Stock: {product.minStock}</Text>
                    </View>
                    
                    <View style={styles.stockBar}>
                      <View style={[styles.stockFill, { width: `${(product.stock / (product.stock + 1000)) * 100}%` }]} />
                    </View>
                    
                    <View style={styles.inventoryActions}>
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => {
                          Alert.prompt(
                            'Edit Stock',
                            `Current stock: ${product.stock}`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Update', 
                                onPress: (newStock) => {
                                  const stock = parseInt(newStock || '0');
                                  if (!isNaN(stock) && stock >= 0) {
                                    updateProductDetails(product.id, { stock });
                                  }
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.editButtonText}>📊 Update Stock</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => {
                          Alert.prompt(
                            'Edit Price',
                            `Current price: ₦${product.price}`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Update', 
                                onPress: (newPrice) => {
                                  const price = parseInt(newPrice || '0');
                                  if (!isNaN(price) && price >= 0) {
                                    updateProductDetails(product.id, { price });
                                  }
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.editButtonText}>💰 Update Price</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => {
                          Alert.prompt(
                            'Edit Min Stock',
                            `Current min stock: ${product.minStock}`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Update', 
                                onPress: (newMinStock) => {
                                  const minStock = parseInt(newMinStock || '0');
                                  if (!isNaN(minStock) && minStock >= 0) {
                                    updateProductDetails(product.id, { minStock });
                                  }
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.editButtonText}>⚠️ Update Min Stock</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={() => deleteProduct(product.id)}
                      >
                        <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {currentView === 'orders' && (
              <View style={styles.ordersView}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Order Management</Text>
                  <Text style={styles.sectionSubtitle}>Manage and update order statuses - Changes sync to customer app</Text>
                  <Text style={styles.debugInfo}>
                    DEBUG: Admin Orders Count: {adminOrders.length} | User: {user?.role} | Last Update: {new Date().toLocaleTimeString()}
                  </Text>
                </View>
                
                {adminOrders.map(order => (
                  <View key={order.id} style={styles.enhancedOrderCard}>
                    {/* Order Header with Status */}
                    <View style={styles.orderHeader}>
                      <View style={styles.orderIdSection}>
                        <Text style={styles.orderId}>Order #{order.id}</Text>
                        <Text style={styles.adminOrderDate}>
                          📅 {order.orderDate.toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                        <Text style={styles.statusText}>{order.status.replace('_', ' ').toUpperCase()}</Text>
                      </View>
                    </View>
                    
                    {/* Customer Information */}
                    <View style={styles.orderCustomerInfo}>
                      <Text style={styles.customerName}>👤 {order.customerName}</Text>
                      <Text style={styles.customerEmail}>{order.customerEmail || 'Email not provided'}</Text>
                      <Text style={styles.customerPhone}>📞 {order.customerPhone || 'Phone not provided'}</Text>
                    </View>
                    
                    {/* Order Details */}
                    <View style={styles.orderDetails}>
                      <Text style={styles.orderItems}>
                        {order.items ? `${order.items.length} items` : 'Single item order'}
                      </Text>
                      <Text style={styles.orderTotal}>💰 ₦{order.total.toLocaleString()}</Text>
                    </View>
                    
                    {/* Delivery Information */}
                    <View style={styles.deliveryInfo}>
                      <Text style={styles.deliveryAddress}>📍 {order.deliveryAddress}</Text>
                      <View style={styles.deliveryMeta}>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(order.priority) }]}>
                          <Text style={styles.priorityText}>{order.priority.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.deliveryTime}>🕐 {order.estimatedDeliveryTime}</Text>
                      </View>
                    </View>
                    
                    {/* Order Notes */}
                    {order.notes && (
                      <View style={styles.orderNotes}>
                        <Text style={styles.notesLabel}>📝 Admin Notes:</Text>
                        <Text style={styles.notesText}>{order.notes}</Text>
                      </View>
                    )}
                    
                    {/* Primary Actions - Status Updates */}
                    <View style={styles.primaryActions}>
                      {order.status === 'pending' && (
                        <TouchableOpacity 
                          style={styles.confirmButton}
                          onPress={() => updateOrderStatus(order.id, 'confirmed')}
                        >
                          <Text style={styles.confirmButtonText}>✅ Confirm Order</Text>
                        </TouchableOpacity>
                      )}
                      {order.status === 'confirmed' && (
                        <TouchableOpacity 
                          style={styles.deliveryButton}
                          onPress={() => updateOrderStatus(order.id, 'out_for_delivery')}
                        >
                          <Text style={styles.deliveryButtonText}>🚚 Start Delivery</Text>
                        </TouchableOpacity>
                      )}
                      {order.status === 'out_for_delivery' && (
                        <TouchableOpacity 
                          style={styles.deliveredButton}
                          onPress={() => updateOrderStatus(order.id, 'delivered')}
                        >
                          <Text style={styles.deliveredButtonText}>🎉 Mark Delivered</Text>
                        </TouchableOpacity>
                      )}
                      {order.status === 'delivered' && (
                        <View style={styles.deliveredStatus}>
                          <Text style={styles.deliveredStatusText}>✅ Order Completed</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Secondary Actions - Driver Assignment & Editing */}
                    <View style={styles.secondaryActions}>
                      {order.status === 'confirmed' && (
                        <TouchableOpacity 
                          style={styles.assignDriverButton}
                          onPress={() => {
                            const availableDrivers = mockDrivers.filter(d => d.status === 'available');
                            if (availableDrivers.length > 0) {
                              assignDriverToOrder(order.id, availableDrivers[0].id);
                            } else {
                              Alert.alert('No Drivers Available', 'All drivers are currently busy');
                            }
                          }}
                        >
                          <Text style={styles.assignDriverButtonText}>👨‍💼 Assign Driver</Text>
                        </TouchableOpacity>
                      )}
                      
                      {/* Edit Order Details */}
                      <TouchableOpacity 
                        style={styles.editOrderButton}
                        onPress={() => {
                          Alert.alert(
                            'Edit Order Details',
                            'What would you like to edit?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Open Chat', onPress: () => openChatForOrder(order.id) },
                              { 
                                text: 'Customer Name', 
                                onPress: () => {
                                  Alert.prompt(
                                    'Edit Customer Name',
                                    `Current name: ${order.customerName}`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      { 
                                        text: 'Update', 
                                        onPress: (newName) => {
                                          if (newName && newName.trim()) {
                                            updateOrderDetails(order.id, { customerName: newName.trim() });
                                          }
                                        }
                                      }
                                    ]
                                  );
                                }
                              },
                              { 
                                text: 'Delivery Address', 
                                onPress: () => {
                                  Alert.prompt(
                                    'Edit Delivery Address',
                                    `Current address: ${order.deliveryAddress}`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      { 
                                        text: 'Update', 
                                        onPress: (newAddress) => {
                                          if (newAddress && newAddress.trim()) {
                                            updateOrderDetails(order.id, { deliveryAddress: newAddress.trim() });
                                          }
                                        }
                                      }
                                    ]
                                  );
                                }
                              },
                              { 
                                text: 'Delivery Time', 
                                onPress: () => {
                                  Alert.prompt(
                                    'Edit Estimated Delivery Time',
                                    `Current time: ${order.estimatedDeliveryTime}`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      { 
                                        text: 'Update', 
                                        onPress: (newTime) => {
                                          if (newTime && newTime.trim()) {
                                            updateOrderDetails(order.id, { estimatedDeliveryTime: newTime.trim() });
                                          }
                                        }
                                      }
                                    ]
                                  );
                                }
                              },
                              { 
                                text: 'Customer Email', 
                                onPress: () => {
                                  Alert.prompt(
                                    'Edit Customer Email',
                                    `Current email: ${order.customerEmail || 'Not provided'}`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      { 
                                        text: 'Update', 
                                        onPress: (newEmail) => {
                                          if (newEmail && newEmail.trim()) {
                                            // Basic email validation
                                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                            if (emailRegex.test(newEmail.trim())) {
                                              updateOrderDetails(order.id, { customerEmail: newEmail.trim() });
                                            } else {
                                              Alert.alert('Invalid Email', 'Please enter a valid email address');
                                            }
                                          }
                                        }
                                      }
                                    ]
                                  );
                                }
                              },
                              { 
                                text: 'Customer Phone', 
                                onPress: () => {
                                  Alert.prompt(
                                    'Edit Customer Phone',
                                    `Current phone: ${order.customerPhone || 'Not provided'}`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      { 
                                        text: 'Update', 
                                        onPress: (newPhone) => {
                                          if (newPhone && newPhone.trim()) {
                                            // Basic phone validation (allows various formats)
                                            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
                                            if (phoneRegex.test(newPhone.trim())) {
                                              updateOrderDetails(order.id, { customerPhone: newPhone.trim() });
                                            } else {
                                              Alert.alert('Invalid Phone', 'Please enter a valid phone number (minimum 10 digits)');
                                            }
                                          }
                                        }
                                      }
                                    ]
                                  );
                                }
                              },
                              { 
                                text: 'Order Priority', 
                                onPress: () => {
                                  Alert.alert(
                                    'Edit Order Priority',
                                    'Select new priority level:',
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      { 
                                        text: 'High Priority', 
                                        onPress: () => updateOrderDetails(order.id, { priority: 'high' })
                                      },
                                      { 
                                        text: 'Medium Priority', 
                                        onPress: () => updateOrderDetails(order.id, { priority: 'medium' })
                                      },
                                      { 
                                        text: 'Low Priority', 
                                        onPress: () => updateOrderDetails(order.id, { priority: 'low' })
                                      }
                                    ]
                                  );
                                }
                              },
                              { 
                                text: 'Payment Method', 
                                onPress: () => {
                                  Alert.alert(
                                    'Edit Payment Method',
                                    'Select new payment method:',
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      { 
                                        text: 'Cash', 
                                        onPress: () => updateOrderDetails(order.id, { paymentMethod: 'cash' })
                                      },
                                      { 
                                        text: 'Card', 
                                        onPress: () => updateOrderDetails(order.id, { paymentMethod: 'card' })
                                      },
                                      { 
                                        text: 'Transfer', 
                                        onPress: () => updateOrderDetails(order.id, { paymentMethod: 'transfer' })
                                      }
                                    ]
                                  );
                                }
                              },
                              { 
                                text: 'Delivery Zone', 
                                onPress: () => {
                                  Alert.alert(
                                    'Edit Delivery Zone',
                                    'Select new delivery zone:',
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      { 
                                        text: 'Victoria Island', 
                                        onPress: () => updateOrderDetails(order.id, { deliveryZone: 'Victoria Island' })
                                      },
                                      { 
                                        text: 'Lekki', 
                                        onPress: () => updateOrderDetails(order.id, { deliveryZone: 'Lekki' })
                                      },
                                      { 
                                        text: 'Ikeja', 
                                        onPress: () => updateOrderDetails(order.id, { deliveryZone: 'Ikeja' })
                                      },
                                      { 
                                        text: 'Surulere', 
                                        onPress: () => updateOrderDetails(order.id, { deliveryZone: 'Surulere' })
                                      },
                                      { 
                                        text: 'Yaba', 
                                        onPress: () => updateOrderDetails(order.id, { deliveryZone: 'Yaba' })
                                      }
                                    ]
                                  );
                                }
                              },
                              { 
                                text: 'Add/Edit Notes', 
                                onPress: () => {
                                  Alert.prompt(
                                    'Add/Edit Order Notes',
                                    `Current notes: ${order.notes || 'No notes yet'}`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      { 
                                        text: 'Update', 
                                        onPress: (newNotes) => {
                                          if (newNotes !== null && newNotes !== undefined) { // Allow empty notes
                                            updateOrderDetails(order.id, { notes: newNotes.trim() });
                                          }
                                        }
                                      }
                                    ]
                                  );
                                }
                              },
                              { 
                                text: 'Order Total', 
                                onPress: () => {
                                  Alert.prompt(
                                    'Edit Order Total',
                                    `Current total: ₦${order.total.toLocaleString()}`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      { 
                                        text: 'Update', 
                                        onPress: (newTotal) => {
                                          if (newTotal && newTotal.trim()) {
                                            const total = parseInt(newTotal.replace(/[^\d]/g, ''));
                                            if (!isNaN(total) && total >= 0) {
                                              updateOrderDetails(order.id, { total });
                                            } else {
                                              Alert.alert('Invalid Amount', 'Please enter a valid amount');
                                            }
                                          }
                                        }
                                      }
                                    ]
                                  );
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.editOrderButtonText}>✏️ Edit Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {currentView === 'delivery' && (
              <View style={styles.deliveryView}>
                <Text style={styles.sectionTitle}>Delivery Management</Text>
                
                {/* Driver Management */}
                <View style={styles.driverSection}>
                  <Text style={styles.subsectionTitle}>Driver Management</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.driverScroll}>
                    {mockDrivers.map(driver => (
                      <View key={driver.id} style={styles.driverCard}>
                        <View style={styles.driverHeader}>
                          <Text style={styles.driverName}>{driver.name}</Text>
                          <View style={[styles.driverStatus, { backgroundColor: getDriverStatusColor(driver.status) }]}>
                            <Text style={styles.driverStatusText}>{driver.status.replace('_', ' ').toUpperCase()}</Text>
                          </View>
                        </View>
                        <Text style={styles.driverVehicle}>{driver.vehicle}</Text>
                        <Text style={styles.driverZone}>Zone: {driver.currentZone}</Text>
                        <Text style={styles.driverRating}>Rating: {driver.rating} ⭐</Text>
                        <Text style={styles.driverDeliveries}>Today: {driver.deliveriesToday} deliveries</Text>
                        <TouchableOpacity style={styles.driverActionButton}>
                          <Text style={styles.driverActionText}>Contact</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {/* Delivery Routes */}
                <View style={styles.routesSection}>
                  <Text style={styles.subsectionTitle}>Active Delivery Routes</Text>
                  {adminDeliveryRoutes.map(route => (
                    <View key={route.id} style={styles.routeCard}>
                      <View style={styles.routeHeader}>
                        <Text style={styles.routeId}>Route #{route.id}</Text>
                        <View style={[styles.routeStatus, { backgroundColor: getRouteStatusColor(route.status) }]}>
                          <Text style={styles.routeStatusText}>{route.status.replace('_', ' ').toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={styles.routeDriver}>{route.driver} - {route.vehicle}</Text>
                      <Text style={styles.routeZone}>Zone: {route.zone}</Text>
                      <Text style={styles.routeTime}>{route.startTime} - {route.endTime} ({route.estimatedTime})</Text>
                      
                      <View style={styles.routeOrders}>
                        <Text style={styles.routeOrdersTitle}>Orders in Route:</Text>
                        {route.clusterId && (
                          <View style={styles.clusterInfo}>
                            <Text style={styles.clusterInfoText}>
                              🎯 Cluster #{route.clusterId} | 
                              Total: ₦{route.totalValue?.toLocaleString() || 'N/A'} | 
                              Capacity: {route.totalCapacity || 'N/A'}L
                            </Text>
                          </View>
                        )}
                        {route.route.map((stop, index) => (
                          <View key={stop.orderId} style={styles.routeStop}>
                            <Text style={styles.stopNumber}>{index + 1}.</Text>
                            <View style={styles.stopDetails}>
                              <Text style={styles.stopCustomer}>{stop.customer}</Text>
                              <Text style={styles.stopAddress}>{stop.address}</Text>
                              <Text style={styles.stopTime}>ETA: {stop.estimatedTime}</Text>
                            </View>
                            <View style={[styles.stopPriority, { backgroundColor: getPriorityColor(stop.priority) }]}>
                              <Text style={styles.stopPriorityText}>{stop.priority.toUpperCase()}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                      
                      <View style={styles.routeActions}>
                        {route.status === 'scheduled' && (
                          <TouchableOpacity 
                            style={styles.routeActionButton}
                            onPress={() => updateDeliveryStatus(route.id, 'in_progress')}
                          >
                            <Text style={styles.routeActionText}>Start Route</Text>
                          </TouchableOpacity>
                        )}
                        {route.status === 'in_progress' && (
                          <TouchableOpacity 
                            style={styles.routeActionButton}
                            onPress={() => updateDeliveryStatus(route.id, 'completed')}
                          >
                            <Text style={styles.routeActionText}>Complete Route</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.routeActionButton}>
                          <Text style={styles.routeActionText}>View Map</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Delivery Schedule */}
                <View style={styles.scheduleSection}>
                  <Text style={styles.subsectionTitle}>Today's Delivery Schedule</Text>
                  {mockDeliverySchedule.map((schedule, index) => (
                    <View key={index} style={styles.scheduleCard}>
                      <View style={styles.scheduleTime}>
                        <Text style={styles.scheduleTimeText}>{schedule.time}</Text>
                      </View>
                      <View style={styles.scheduleDetails}>
                        <Text style={styles.scheduleZone}>{schedule.zone}</Text>
                        <Text style={styles.scheduleDriver}>{schedule.driver}</Text>
                        <Text style={styles.scheduleOrders}>{schedule.orders} orders</Text>
                      </View>
                      <View style={[styles.scheduleStatus, { backgroundColor: getRouteStatusColor(schedule.status) }]}>
                        <Text style={styles.scheduleStatusText}>{schedule.status.replace('_', ' ').toUpperCase()}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Smart Order Clustering */}
                <View style={styles.clusteringSection}>
                  <Text style={styles.subsectionTitle}>Smart Order Clustering</Text>
                  <View style={styles.clusteringInfo}>
                    <Text style={styles.clusteringText}>
                      Automatically group nearby orders for efficient batch delivery
                    </Text>
                    <Text style={styles.clusteringStats}>
                      Current orders: {adminOrders.filter(o => o.status === 'confirmed').length} | 
                      Max cluster distance: 2km | 
                      Vehicle capacity: 50L
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.clusterButton}
                    onPress={autoClusterOrders}
                  >
                    <Text style={styles.clusterButtonText}>🚀 Auto-Cluster Orders</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.clusteringGrid}>
                    <TouchableOpacity 
                      style={styles.quickActionButton}
                      onPress={() => optimizeDeliveryRoute('Victoria Island')}
                    >
                      <Text style={styles.quickActionText}>Optimize Victoria Island</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.quickActionButton}
                      onPress={() => optimizeDeliveryRoute('Lekki')}
                    >
                      <Text style={styles.quickActionText}>Optimize Lekki</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.quickActionButton}
                      onPress={() => optimizeDeliveryRoute('Ikeja')}
                    >
                      <Text style={styles.quickActionText}>Optimize Ikeja</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.quickActionButton}
                      onPress={() => Alert.alert('New Route', 'Creating new delivery route...')}
                    >
                      <Text style={styles.quickActionText}>Create New Route</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {currentView === 'supportInbox' && user.role === 'admin' && (
              <View style={styles.ordersView}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Support Inbox</Text>
                  <Text style={styles.sectionSubtitle}>Customer support conversations</Text>
                  <Text style={styles.debugInfo}>
                    DEBUG: User role: {user?.role} | Current view: {currentView} | Supabase URL: {process.env.EXPO_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}
                  </Text>
                </View>
                
                {/* Admin Chat Actions */}
                <View style={styles.fullWidthCard}>
                  <TouchableOpacity
                    style={styles.adminChatButton}
                    onPress={async () => {
                      console.log('Loading support messages...');
                      const { data, error } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('type', 'support')
                        .order('created_at', { ascending: false })
                        .limit(50);
                      
                      console.log('Support messages result:', { data, error });
                      
                      if (error) {
                        Alert.alert('Error', 'Failed to load support messages: ' + error.message);
                        return;
                      }
                      
                      if (!data || data.length === 0) {
                        Alert.alert('Support Inbox', 'No customer support messages yet.\\n\\nCustomers can contact support by tapping the \"Support\" button in the customer app.');
                        return;
                      }
                      
                      // Group by customer
                      const grouped = data.reduce((acc: any, msg: any) => {
                        const key = msg.sender_id || 'anonymous';
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(msg);
                        return acc;
                      }, {});
                      
                      const conversations = Object.keys(grouped).map(senderId => ({
                        customer: senderId,
                        lastMessage: grouped[senderId][0],
                        messageCount: grouped[senderId].length,
                        lastTime: new Date(grouped[senderId][0].created_at).toLocaleString()
                      }));
                      
                      const conversationList = conversations.map((c, i) => 
                        `${i + 1}. ${c.customer}\\n   \"${c.lastMessage.content.substring(0, 50)}${c.lastMessage.content.length > 50 ? '...' : ''}\"\\n   ${c.messageCount} messages • ${c.lastTime}`
                      ).join('\\n\\n');
                      
                      Alert.alert(
                        `Support Conversations (${conversations.length})`,
                        conversationList,
                        [
                          { text: 'Close' },
                          { text: 'Open Support Chat', onPress: () => openSupportChat() }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.adminChatButtonText}>📋 View All Support Conversations</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.adminChatButtonSecondary}
                    onPress={() => {
                      console.log('Opening support chat as admin, user role:', user?.role);
                      Alert.alert('Admin Chat Test', `User role: ${user?.role}\nChat functions available: ${typeof openSupportChat}\nSupabase configured: ${process.env.EXPO_PUBLIC_SUPABASE_URL ? 'Yes' : 'No'}`);
                      openSupportChat();
                    }}
                  >
                    <Text style={styles.adminChatButtonSecondaryText}>💬 Open Support Chat (TEST)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.adminChatButton, { backgroundColor: '#F59E0B' }]}
                    onPress={() => {
                      Alert.alert(
                        'Database Connection Test',
                        'This will test your Supabase connection',
                        [
                          { text: 'Cancel' },
                          { 
                            text: 'Test Connection', 
                            onPress: async () => {
                              try {
                                console.log('Testing Supabase connection...');
                                
                                // Test 1: Try to query messages table
                                const { data: messages, error: msgError } = await supabase
                                  .from('messages')
                                  .select('count', { count: 'exact' })
                                  .limit(1);
                                
                                if (msgError) {
                                  Alert.alert('Messages Table Error', `Error: ${msgError.message}\n\nThis means the messages table setup from earlier didn't work properly.`);
                                  return;
                                }
                                
                                // Test 2: Try to insert a test message
                                const { error: insertError } = await supabase.from('messages').insert({
                                  order_id: null,
                                  type: 'support',
                                  sender_role: 'admin',
                                  sender_id: user?.email || 'admin@test.com',
                                  content: `Connection test at ${new Date().toLocaleTimeString()}`
                                });
                                
                                if (insertError) {
                                  Alert.alert('Insert Test Failed', `Error: ${insertError.message}\n\nThe messages table exists but insert failed. Check your RLS policies.`);
                                  return;
                                }
                                
                                // Test 3: Try to query customers table
                                const { data: customers, error: custError } = await supabase
                                  .from('customers')
                                  .select('count', { count: 'exact' })
                                  .limit(1);
                                
                                const custStatus = custError ? 'Missing/Error' : 'OK';
                                
                                Alert.alert(
                                  'Connection Test Results', 
                                  `✅ Supabase Connected\n✅ Messages table: OK\n${custStatus === 'OK' ? '✅' : '❌'} Customers table: ${custStatus}\n\n${custStatus !== 'OK' ? 'Run the simple_setup.sql to create customers table!' : 'All tables ready!'}`
                                );
                                
                              } catch (error) {
                                Alert.alert('Connection Failed', `Failed to connect to Supabase:\n${error}`);
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.adminChatButtonText}>🧪 Test Database Connection</Text>
                  </TouchableOpacity>
                  
                  {/* Order Chat Actions */}
                  <TouchableOpacity
                    style={styles.adminChatButton}
                    onPress={async () => {
                      console.log('Loading order messages...');
                      const { data, error } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('type', 'order')
                        .order('created_at', { ascending: false })
                        .limit(50);
                      
                      console.log('Order messages result:', { data, error });
                      
                      if (error) {
                        Alert.alert('Error', 'Failed to load order messages: ' + error.message);
                        return;
                      }
                      
                      if (!data || data.length === 0) {
                        Alert.alert('Order Chats', 'No order chat messages yet.\\n\\nCustomers can chat about specific orders from their order history.');
                        return;
                      }
                      
                      // Group by order
                      const grouped = data.reduce((acc: any, msg: any) => {
                        const key = msg.order_id || 'unknown';
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(msg);
                        return acc;
                      }, {});
                      
                      const orderChats = Object.keys(grouped).map(orderId => ({
                        orderId,
                        lastMessage: grouped[orderId][0],
                        messageCount: grouped[orderId].length,
                        lastTime: new Date(grouped[orderId][0].created_at).toLocaleString()
                      }));
                      
                      const chatList = orderChats.map((c, i) => 
                        `${i + 1}. Order #${c.orderId}\\n   \"${c.lastMessage.content.substring(0, 50)}${c.lastMessage.content.length > 50 ? '...' : ''}\"\\n   ${c.messageCount} messages • ${c.lastTime}`
                      ).join('\\n\\n');
                      
                      Alert.alert(
                        `Order Chats (${orderChats.length})`,
                        chatList,
                        [
                          { text: 'Close' },
                          ...(orderChats.length > 0 ? [{ 
                            text: 'Open First Chat', 
                            onPress: () => {
                              console.log('Opening chat for order:', orderChats[0].orderId);
                              openChatForOrder(orderChats[0].orderId);
                            }
                          }] : [])
                        ]
                      );
                    }}
                  >
                    <Text style={styles.adminChatButtonText}>📦 View All Order Chats</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.supportInboxHelp}>
                    💡 As an admin, you can:{'\n'}• View all customer support messages{'\n'}• Reply to order-specific chats{'\n'}• Monitor customer conversations in real-time
                  </Text>
                </View>
              </View>
            )}

            {currentView === 'analytics' && (
              <View style={styles.analyticsView}>
                <Text style={styles.sectionTitle}>Business Intelligence</Text>
                <View style={styles.analyticsGrid}>
                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsTitle}>Revenue Trends</Text>
                    <Text style={styles.analyticsValue}>₦2.45M</Text>
                    <Text style={styles.analyticsSubtitle}>Monthly Revenue</Text>
                    <View style={styles.trendIndicator}>
                      <Text style={styles.trendText}>↗ +12.5% vs last month</Text>
                    </View>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsTitle}>Customer Growth</Text>
                    <Text style={styles.analyticsValue}>+15.7%</Text>
                    <Text style={styles.analyticsSubtitle}>New Customers</Text>
                    <View style={styles.trendIndicator}>
                      <Text style={styles.trendText}>↗ 134 new this month</Text>
                    </View>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsTitle}>Order Fulfillment</Text>
                    <Text style={styles.analyticsValue}>94.2%</Text>
                    <Text style={styles.analyticsSubtitle}>On-time Delivery</Text>
                    <View style={styles.trendIndicator}>
                      <Text style={styles.trendText}>↗ +2.1% vs last month</Text>
                    </View>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsTitle}>Inventory Turnover</Text>
                    <Text style={styles.analyticsValue}>8.5x</Text>
                    <Text style={styles.analyticsSubtitle}>Annual Rate</Text>
                    <View style={styles.trendIndicator}>
                      <Text style={styles.trendText}>↗ +0.3x vs last year</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {currentView === 'notifications' && (
              <View style={styles.notificationsView}>
                <Text style={styles.sectionTitle}>System Notifications</Text>
                <View style={styles.notificationCard}>
                  <Text style={styles.notificationTitle}>Low Stock Alert</Text>
                  <Text style={styles.notificationText}>ZADA Water Filter Cartridge stock is below minimum threshold</Text>
                  <Text style={styles.notificationTime}>2 hours ago</Text>
                </View>
                <View style={styles.notificationCard}>
                  <Text style={styles.notificationTitle}>High Priority Order</Text>
                  <Text style={styles.notificationText}>New high-priority order from Victoria Island zone</Text>
                  <Text style={styles.notificationTime}>1 hour ago</Text>
                </View>
                <View style={styles.notificationCard}>
                  <Text style={styles.notificationTitle}>Delivery Route Update</Text>
                  <Text style={styles.notificationText}>Optimized delivery route saves 15 minutes per delivery</Text>
                  <Text style={styles.notificationTime}>3 hours ago</Text>
                </View>
              </View>
            )}
          </>
        ) : (
          // Enhanced Customer Views
          <>
            {customerView === 'home' && (
              <View style={styles.customerContent}>
                {/* Welcome Header */}
                <View style={styles.customerHeader}>
                  <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeTitle}>Welcome back, {user.name}! 👋</Text>
                    <Text style={styles.welcomeSubtitle}>Ready to order some fresh ZADA water?</Text>
                  </View>
                  <View style={styles.quickStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{customerOrders.length}</Text>
                      <Text style={styles.statLabel}>Orders</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        ₦{customerOrders.reduce((sum, order) => sum + order.total, 0).toLocaleString()}
                      </Text>
                      <Text style={styles.statLabel}>Spent</Text>
                    </View>
                  </View>
                </View>

                {/* Support Chat Button */}
                <View style={styles.supportChatSection}>
                  <TouchableOpacity 
                    style={styles.supportChatButton}
                    onPress={openSupportChat}
                  >
                    <View style={styles.supportChatIcon}>
                      <Text style={styles.supportChatIconText}>💬</Text>
                    </View>
                    <View style={styles.supportChatInfo}>
                      <Text style={styles.supportChatTitle}>Need Help?</Text>
                      <Text style={styles.supportChatSubtitle}>Chat with our support team for product inquiries, order help, or any questions</Text>
                    </View>
                    <View style={styles.supportChatArrow}>
                      <Text style={styles.supportChatArrowText}>→</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Featured Products Section */}
                <View style={styles.featuredProductsSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Featured Products</Text>
                    <Text style={styles.sectionSubtitle}>Our most popular water products</Text>
                  </View>
                  
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredProductsScroll}>
                    {products.slice(0, 4).map(product => (
                      <View key={product.id} style={styles.featuredProductCard}>
                        <View style={[styles.featuredProductImage, { backgroundColor: getProductImageColor(product.category) }]}>
                          <Text style={styles.featuredProductIcon}>{product.image}</Text>
                          <View style={[styles.featuredStockBadge, { backgroundColor: product.stock > 100 ? '#10B981' : '#F59E0B' }]}>
                            <Text style={styles.featuredStockText}>{product.stock > 100 ? 'In Stock' : 'Low Stock'}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.featuredProductInfo}>
                          <Text style={styles.featuredProductTitle}>{product.name}</Text>
                          <Text style={styles.featuredProductPrice}>₦{product.price.toLocaleString()}</Text>
                          <TouchableOpacity 
                            style={styles.featuredAddToCartButton}
                            onPress={() => addToCart(product)}
                          >
                            <Text style={styles.featuredAddToCartButtonText}>Add to Cart</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {/* Quick Order Section */}
                <View style={styles.quickOrderSection}>
                  <View style={styles.quickOrderHeader}>
                    <Text style={styles.quickOrderTitle}>Quick Order</Text>
                    <Text style={styles.quickOrderSubtitle}>Most popular choice</Text>
                  </View>
                  <View style={styles.quickOrderCard}>
                    <View style={styles.quickOrderInfo}>
                      <Text style={styles.quickOrderProduct}>ZADA Pure Water 50cl</Text>
                      <Text style={styles.quickOrderPrice}>₦100</Text>
                      <Text style={styles.quickOrderDescription}>Perfect for daily hydration</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.quickOrderButton}
                      onPress={() => addToCart(products[0])}
                    >
                      <Text style={styles.quickOrderButtonText}>Add to Cart</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Special Offers */}
                <View style={styles.offersSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Special Offers</Text>
                    <Text style={styles.sectionSubtitle}>Save more on bulk orders</Text>
                  </View>
                  
                  <View style={styles.offerCard}>
                    <View style={styles.offerBadge}>
                      <Text style={styles.offerBadgeText}>SAVE 15%</Text>
                    </View>
                    <Text style={styles.offerTitle}>Bulk Order Discount</Text>
                    <Text style={styles.offerDescription}>Order 10+ bottles and get 15% off your total</Text>
                    <TouchableOpacity style={styles.offerButton}>
                      <Text style={styles.offerButtonText}>Learn More</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {customerView === 'products' && (
              <View style={styles.productsView}>
                {/* Search, Filter, Sort */}
                <View style={styles.searchSection}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search products..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {['all', 'water', 'dispenser', 'accessories'].map(category => (
                      <TouchableOpacity
                        key={category}
                        style={[styles.categoryButton, selectedCategory === category && styles.activeCategoryButton]}
                        onPress={() => setSelectedCategory(category)}
                      >
                        <Text style={[styles.categoryButtonText, selectedCategory === category && styles.activeCategoryButtonText]}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {([
                      { key: 'popular', label: 'Popular' },
                      { key: 'price_asc', label: 'Price: Low → High' },
                      { key: 'price_desc', label: 'Price: High → Low' },
                    ] as const).map(opt => (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.categoryButton, productSort === opt.key && styles.activeCategoryButton]}
                        onPress={() => setProductSort(opt.key)}
                      >
                        <Text style={[styles.categoryButtonText, productSort === opt.key && styles.activeCategoryButtonText]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Simplified Products Grid (two columns) */}
                <View style={styles.productsGrid}>
                  {sortedFilteredProducts.map(product => (
                    <View key={product.id} style={styles.simpleProductCard}>
                      <View style={styles.simpleProductTopRow}>
                        <View style={[styles.simpleProductThumb, { backgroundColor: getProductImageColor(product.category) }]}>
                          <Text style={styles.productIcon}>{product.image}</Text>
                        </View>
                        <View style={styles.simpleProductInfo}>
                          <Text style={styles.simpleProductTitle} numberOfLines={2}>{product.name}</Text>
                          <Text style={styles.simpleProductPrice}>₦{product.price.toLocaleString()}</Text>
                          <Text style={styles.simpleProductStock}>
                            {product.stock > 100 ? 'In stock' : `Low stock: ${product.stock}`}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.simpleProductActions}>
                        <View style={styles.qtyStepper}>
                          <TouchableOpacity style={styles.qtyButton} onPress={() => setProductQtyDraft({ ...productQtyDraft, [product.id]: Math.max(1, (productQtyDraft[product.id] || 1) - 1) })}>
                            <Text style={styles.qtyButtonText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyValue}>{productQtyDraft[product.id] || 1}</Text>
                          <TouchableOpacity style={styles.qtyButton} onPress={() => setProductQtyDraft({ ...productQtyDraft, [product.id]: Math.min(product.stock, (productQtyDraft[product.id] || 1) + 1) })}>
                            <Text style={styles.qtyButtonText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity 
                          style={styles.simpleAddButton}
                          onPress={() => {
                            const qty = productQtyDraft[product.id] || 1;
                            for (let i = 0; i < qty; i++) addToCart(product);
                          }}
                        >
                          <Text style={styles.simpleAddButtonText}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {customerView === 'cart' && (
              <View style={styles.cartView}>
                <View style={styles.cartHeader}>
                  <Text style={styles.cartTitle}>Shopping Cart</Text>
                  <Text style={styles.cartSubtitle}>{getCartItemCount()} items • ₦{getCartTotal().toLocaleString()}</Text>
                </View>

                {cart.length === 0 ? (
                  <View style={styles.emptyCart}>
                    <Text style={styles.emptyCartIcon}>🛒</Text>
                    <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
                    <Text style={styles.emptyCartSubtitle}>Add some products to get started!</Text>
                    <TouchableOpacity 
                      style={styles.emptyCartButton}
                      onPress={() => setCustomerView('products')}
                    >
                      <Text style={styles.emptyCartButtonText}>Browse Products</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {cart.map((item, index) => (
                      <View key={index} style={styles.cartItem}>
                        <View style={styles.cartItemImage}>
                          <Text style={styles.cartItemIcon}>💧</Text>
                        </View>
                        <View style={styles.cartItemInfo}>
                          <Text style={styles.cartItemName}>{item.product.name}</Text>
                          <Text style={styles.cartItemPrice}>₦{item.product.price.toLocaleString()}</Text>
                          <View style={styles.quantityControls}>
                            <TouchableOpacity 
                              style={styles.quantityButton}
                              onPress={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Text style={styles.quantityButtonText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>{item.quantity}</Text>
                            <TouchableOpacity 
                              style={styles.quantityButton}
                              onPress={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Text style={styles.quantityButtonText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={styles.removeButton}
                          onPress={() => removeFromCart(item.product.id)}
                        >
                          <Text style={styles.removeButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    <View style={styles.cartSummary}>
                      <View style={styles.cartTotal}>
                        <Text style={styles.cartTotalLabel}>Total:</Text>
                        <Text style={styles.cartTotalAmount}>₦{getCartTotal().toLocaleString()}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.checkoutButton}
                        onPress={proceedToCheckout}
                      >
                        <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}

            {customerView === 'orders' && (
              <View style={styles.ordersView}>
                {/* Professional Orders Header */}
                <View style={styles.professionalOrdersHeader}>
                  <View style={styles.ordersHeaderTop}>
                    <View>
                      <Text style={styles.ordersHeaderTitle}>Order History</Text>
                      <Text style={styles.ordersHeaderSubtitle}>
                        {customerOrders.length} {customerOrders.length === 1 ? 'order' : 'orders'} • Last synced {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.modernRefreshButton}
                      onPress={refreshCustomerOrders}
                    >
                      <Text style={styles.modernRefreshButtonText}>🔄</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {customerOrders.length > 0 ? (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.ordersListContainer}>
                    {customerOrders.slice().reverse().map((order, index) => (
                      <View key={order.id} style={styles.modernOrderCard}>
                        {/* Order Header */}
                        <View style={styles.modernOrderHeader}>
                          <View style={styles.orderHeaderLeft}>
                            <Text style={styles.modernOrderNumber}>Order #{customerOrders.length - index}</Text>
                            <Text style={styles.modernOrderDate}>
                              {new Date(order.orderDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                          </View>
                          <View style={[styles.modernOrderStatus, { backgroundColor: getOrderStatusColor(order.status) }]}>
                            <Text style={styles.modernOrderStatusText}>
                              {order.status === 'out_for_delivery' ? 'Delivering' : order.status.replace('_', ' ').toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        {/* Order Content */}
                        <View style={styles.modernOrderContent}>
                          <View style={styles.orderSummaryRow}>
                            <View style={styles.orderItemsInfo}>
                              <Text style={styles.orderItemsCount}>
                                {order.items ? `${order.items.length} items` : '1 item'} • {order.items ? order.items.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0) : order.quantity} units
                              </Text>
                              <Text style={styles.modernOrderTotal}>₦{order.total.toLocaleString()}</Text>
                            </View>
                          </View>
                          
                          <View style={styles.modernDeliveryInfo}>
                            <Text style={styles.deliveryLabel}>📍 Delivery Address</Text>
                            <Text style={styles.modernDeliveryAddress}>{order.deliveryAddress}</Text>
                            <Text style={styles.modernDeliveryPhone}>📞 {order.deliveryPhone}</Text>
                          </View>
                          
                          {/* Progress Indicator */}
                          <View style={styles.orderProgress}>
                            <View style={styles.progressSteps}>
                              {['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'].map((step, stepIndex) => {
                                const currentStepIndex = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'].indexOf(order.status);
                                const isCompleted = stepIndex <= currentStepIndex;
                                const isCurrent = stepIndex === currentStepIndex;
                                return (
                                  <View key={step} style={styles.progressStepContainer}>
                                    <View style={[
                                      styles.progressStep,
                                      isCompleted && styles.progressStepCompleted,
                                      isCurrent && styles.progressStepCurrent
                                    ]}>
                                      {isCompleted ? (
                                        <Text style={styles.progressStepTextCompleted}>✓</Text>
                                      ) : (
                                        <Text style={styles.progressStepText}>{stepIndex + 1}</Text>
                                      )}
                                    </View>
                                    {stepIndex < 4 && (
                                      <View style={[
                                        styles.progressLine,
                                        isCompleted && stepIndex < currentStepIndex && styles.progressLineCompleted
                                      ]} />
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                            <Text style={styles.progressLabel}>
                              {order.status === 'pending' && '⏳ Order received and being processed'}
                              {order.status === 'confirmed' && '✅ Order confirmed by our team'}
                              {order.status === 'preparing' && '🔄 Preparing your water delivery'}
                              {order.status === 'out_for_delivery' && '🚚 Your order is on the way!'}
                              {order.status === 'delivered' && '🎉 Order delivered successfully'}
                            </Text>
                          </View>
                        </View>

                        {/* Order Actions */}
                        <View style={styles.modernOrderActions}>
                          <TouchableOpacity
                            style={styles.modernChatButton}
                            onPress={() => openChatForOrder(order.id)}
                          >
                            <Text style={styles.modernChatButtonText}>💬 Chat Support</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.modernDetailsButton}
                            onPress={() => {
                              setCustomerOrderDetails(order);
                              setShowCustomerOrderModal(true);
                            }}
                          >
                            <Text style={styles.modernDetailsButtonText}>📋 Details</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.modernReorderButton}
                            onPress={() => {
                              if (order.items) {
                                // Add items back to cart
                                order.items.forEach((item: OrderItem) => {
                                  const product = adminProducts.find(p => p.id === item.product.id);
                                  if (product) {
                                    addToCart(product, item.quantity);
                                  }
                                });
                                Alert.alert('Added to Cart', `${order.items.length} items added to your cart`);
                                setCustomerView('cart'); // Navigate to cart
                              }
                            }}
                          >
                            <Text style={styles.modernReorderButtonText}>🔄 Reorder</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.modernEmptyState}>
                    <View style={styles.modernEmptyStateIcon}>
                      <Text style={styles.modernEmptyStateIconText}>📦</Text>
                    </View>
                    <Text style={styles.modernEmptyStateTitle}>No orders yet</Text>
                    <Text style={styles.modernEmptyStateText}>
                      When you place your first order, it will appear here with real-time tracking and delivery updates.
                    </Text>
                    <TouchableOpacity
                      style={styles.modernEmptyStateButton}
                      onPress={() => setCustomerView('products')}
                    >
                      <Text style={styles.modernEmptyStateButtonText}>Start Shopping</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {customerView === 'profile' && (
              <View style={styles.profileView}>
                <View style={styles.profileHeader}>
                  <View style={styles.profileAvatar}>
                    <Text style={styles.profileAvatarText}>{user.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.profileName}>{user.name}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                </View>

                <View style={styles.profileStats}>
                  <View style={styles.profileStat}>
                    <Text style={styles.profileStatNumber}>{customerOrders.length}</Text>
                    <Text style={styles.profileStatLabel}>Total Orders</Text>
                  </View>
                  <View style={styles.profileStat}>
                    <Text style={styles.profileStatNumber}>₦{customerOrders.reduce((sum: number, order: CustomerOrder) => sum + order.total, 0).toLocaleString()}</Text>
                    <Text style={styles.profileStatLabel}>Total Spent</Text>
                  </View>
                </View>

                <View style={styles.profileForm}>
                  <Text style={styles.profileFormLabel}>Full Name</Text>
                  <TextInput style={styles.input} value={profileName} onChangeText={setProfileName} placeholder="Your name" />
                  <Text style={styles.profileFormLabel}>Email</Text>
                  <TextInput style={styles.input} value={profileEmail} onChangeText={setProfileEmail} placeholder="Your email" keyboardType="email-address" />
                  <Text style={styles.profileFormLabel}>Phone</Text>
                  <TextInput style={styles.input} value={profilePhone} onChangeText={setProfilePhone} placeholder="Your phone" keyboardType="phone-pad" />
                  <Text style={styles.profileFormLabel}>Address</Text>
                  <TextInput style={styles.input} value={profileAddress} onChangeText={setProfileAddress} placeholder="Your address" />
                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={async () => {
                      if (!profileName.trim() || !profileEmail.trim()) {
                        Alert.alert('Missing info', 'Name and email are required');
                        return;
                      }
                      const updatedUser: AppUser = {
                        ...(user as AppUser),
                        name: profileName.trim(),
                        email: profileEmail.trim(),
                        phone: profilePhone.trim(),
                        address: profileAddress.trim(),
                      };
                      setUser(updatedUser);
                      await saveCurrentUser(updatedUser);
                      const newUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
                      setUsers(newUsers);
                      await saveUsersToStorage(newUsers);
                      
                      // Also save to Supabase database
                      if (user?.role === 'customer') {
                        await saveCustomerProfile({
                          email: profileEmail.trim(),
                          name: profileName.trim(),
                          phone: profilePhone.trim(),
                          address: profileAddress.trim(),
                        });
                      }
                      
                      Alert.alert('Saved', 'Profile updated and synced to database');
                    }}
                  >
                    <Text style={styles.loginButtonText}>Save Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Customer Order Modal */}
      <Modal
        visible={showCustomerOrderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerOrderModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => {
          Keyboard.dismiss();
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Order Details</Text>
                
                {customerOrderDetails && (
                  <ScrollView style={styles.orderDetailsScroll}>
                    {/* Order Header */}
                    <View style={styles.orderDetailsHeader}>
                      <Text style={styles.orderDetailsNumber}>Order #{customerOrders.findIndex(o => o.id === customerOrderDetails.id) + 1}</Text>
                      <View style={[styles.orderDetailsStatus, { backgroundColor: getOrderStatusColor(customerOrderDetails.status) }]}>
                        <Text style={styles.orderDetailsStatusText}>
                          {customerOrderDetails.status === 'out_for_delivery' ? 'Delivering' : customerOrderDetails.status.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Order Date */}
                    <Text style={styles.orderDetailsDate}>
                      {new Date(customerOrderDetails.orderDate).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    
                    {/* Order Items */}
                    <View style={styles.orderDetailsSection}>
                      <Text style={styles.orderDetailsSectionTitle}>Items Ordered</Text>
                      {customerOrderDetails.items?.map((item: OrderItem, index: number) => (
                        <View key={index} style={styles.orderItemRow}>
                          <View style={styles.orderItemInfo}>
                            <Text style={styles.orderItemName}>{item.product.name}</Text>
                            <Text style={styles.orderItemDescription}>{item.product.description}</Text>
                          </View>
                          <View style={styles.orderItemQuantity}>
                            <Text style={styles.orderItemQtyText}>Qty: {item.quantity}</Text>
                            <Text style={styles.orderItemPrice}>₦{(item.product.price * item.quantity).toLocaleString()}</Text>
                          </View>
                        </View>
                      )) || (
                        <View style={styles.orderItemRow}>
                          <View style={styles.orderItemInfo}>
                            <Text style={styles.orderItemName}>Single Item Order</Text>
                            <Text style={styles.orderItemDescription}>Quantity: {customerOrderDetails.quantity}</Text>
                          </View>
                          <View style={styles.orderItemQuantity}>
                            <Text style={styles.orderItemPrice}>₦{customerOrderDetails.total.toLocaleString()}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                    
                    {/* Order Summary */}
                    <View style={styles.orderDetailsSection}>
                      <Text style={styles.orderDetailsSectionTitle}>Order Summary</Text>
                      <View style={styles.orderSummaryRow}>
                        <Text style={styles.orderSummaryLabel}>Subtotal:</Text>
                        <Text style={styles.orderSummaryValue}>₦{customerOrderDetails.total.toLocaleString()}</Text>
                      </View>
                      <View style={styles.orderSummaryRow}>
                        <Text style={styles.orderSummaryLabel}>Payment Method:</Text>
                        <Text style={styles.orderSummaryValue}>{customerOrderDetails.paymentMethod || 'Cash on Delivery'}</Text>
                      </View>
                      <View style={[styles.orderSummaryRow, styles.orderTotalRow]}>
                        <Text style={styles.orderTotalLabel}>Total:</Text>
                        <Text style={styles.orderTotalValue}>₦{customerOrderDetails.total.toLocaleString()}</Text>
                      </View>
                    </View>
                    
                    {/* Delivery Information */}
                    <View style={styles.orderDetailsSection}>
                      <Text style={styles.orderDetailsSectionTitle}>Delivery Information</Text>
                      <View style={styles.deliveryInfoRow}>
                        <Text style={styles.deliveryInfoLabel}>📍 Address:</Text>
                        <Text style={styles.deliveryInfoValue}>{customerOrderDetails.deliveryAddress}</Text>
                      </View>
                      <View style={styles.deliveryInfoRow}>
                        <Text style={styles.deliveryInfoLabel}>📞 Phone:</Text>
                        <Text style={styles.deliveryInfoValue}>{customerOrderDetails.deliveryPhone}</Text>
                      </View>
                    </View>
                  </ScrollView>
                )}
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={styles.modalCancelButton}
                    onPress={() => setShowCustomerOrderModal(false)}
                  >
                    <Text style={styles.modalCancelButtonText}>Close</Text>
                  </TouchableOpacity>
                  {customerOrderDetails && (
                    <TouchableOpacity 
                      style={styles.modalConfirmButton}
                      onPress={() => {
                        setShowCustomerOrderModal(false);
                        // Reorder functionality
                        if (customerOrderDetails.items) {
                          customerOrderDetails.items.forEach((item: OrderItem) => {
                            const product = adminProducts.find(p => p.id === item.product.id);
                            if (product) {
                              addToCart(product, item.quantity);
                            }
                          });
                          Alert.alert('Added to Cart', `${customerOrderDetails.items.length} items added to your cart`);
                          setCustomerView('cart');
                        }
                      }}
                    >
                      <Text style={styles.modalConfirmButtonText}>🔄 Reorder</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Professional Chat Modal */}
      <Modal
        visible={showChat}
        animationType="slide"
        transparent={true}
        onRequestClose={closeChat}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.chatModalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.chatContainer}>
                {/* Chat Header */}
                <View style={styles.chatHeader}>
                  <View style={styles.chatHeaderInfo}>
                    <Text style={styles.chatTitle}>
                      {chatOrderId ? `Order #${chatOrderId}` : 'Support Chat'}
                    </Text>
                    <Text style={styles.chatSubtitle}>
                      {chatOrderId ? 'Order Discussion' : 'Customer Support'} • {user?.role === 'admin' ? 'Admin View' : 'Customer View'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.chatCloseButton} onPress={closeChat}>
                    <Text style={styles.chatCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Messages Area */}
                <View style={styles.chatMessagesContainer}>
                  {isChatLoading ? (
                    <View style={styles.chatLoadingContainer}>
                      <ActivityIndicator size="large" color="#0EA5E9" />
                      <Text style={styles.chatLoadingText}>Loading messages...</Text>
                    </View>
                  ) : chatMessages.length === 0 ? (
                    <View style={styles.chatEmptyContainer}>
                      <Text style={styles.chatEmptyIcon}>💬</Text>
                      <Text style={styles.chatEmptyText}>
                        {chatOrderId ? 'Start discussing this order' : 'How can we help you today?'}
                      </Text>
                      <Text style={styles.chatEmptySubtext}>
                        {user?.role === 'admin' ? 'Customer messages will appear here' : 'Send a message to get started'}
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      ref={chatListRef}
                      data={chatMessages}
                      keyExtractor={(m) => m.id}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.chatMessagesList}
                      onContentSizeChange={() => chatListRef.current?.scrollToEnd?.({ animated: true })}
                      renderItem={({ item: msg }) => {
                        const isAdmin = msg.sender_role === 'admin';
                        const isCurrentUser = msg.sender_role === (user?.role || 'customer');
                        return (
                          <View style={[
                            styles.chatMessageWrapper,
                            isCurrentUser ? styles.chatMessageWrapperSent : styles.chatMessageWrapperReceived
                          ]}>
                            <View style={[
                              styles.chatMessage,
                              isCurrentUser ? styles.chatMessageSent : styles.chatMessageReceived
                            ]}>
                              {!isCurrentUser && (
                                <Text style={styles.chatSenderName}>
                                  {isAdmin ? '👨‍💼 Admin' : '👤 Customer'}
                                </Text>
                              )}
                              <Text style={[
                                styles.chatMessageText,
                                isCurrentUser ? styles.chatMessageTextSent : styles.chatMessageTextReceived
                              ]}>
                                {msg.content}
                              </Text>
                              <Text style={[
                                styles.chatMessageTime,
                                isCurrentUser ? styles.chatMessageTimeSent : styles.chatMessageTimeReceived
                              ]}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </View>
                          </View>
                        );
                      }}
                    />
                  )}
                </View>

                {/* Message Input */}
                <View style={styles.chatInputContainer}>
                  <View style={styles.chatInputWrapper}>
                    <TextInput
                      style={styles.chatTextInput}
                      placeholder={user?.role === 'admin' ? 'Reply to customer...' : 'Type your message...'}
                      value={chatInput}
                      onChangeText={setChatInput}
                      returnKeyType="send"
                      onSubmitEditing={sendChatMessage}
                      multiline
                      maxLength={500}
                    />
                    <TouchableOpacity
                      style={[
                        styles.chatSendButton,
                        !chatInput.trim() && styles.chatSendButtonDisabled
                      ]}
                      onPress={sendChatMessage}
                      disabled={!chatInput.trim()}
                    >
                      <Text style={styles.chatSendButtonText}>Send</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Checkout Modal */}
      <Modal
        visible={showCheckout}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCheckout(false)}
      >
        <TouchableWithoutFeedback onPress={() => {
          Keyboard.dismiss();
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Checkout</Text>
                
                <Text style={styles.modalLabel}>Delivery Address:</Text>
                <TextInput
                  style={styles.modalInput}
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  placeholder="Enter your delivery address..."
                  multiline
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
                
                <Text style={styles.modalLabel}>Phone Number:</Text>
                <TextInput
                  style={styles.modalInput}
                  value={deliveryPhone}
                  onChangeText={setDeliveryPhone}
                  placeholder="Enter your phone number..."
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
                
                <Text style={styles.modalLabel}>Payment Method:</Text>
                <View style={styles.paymentOptions}>
                  {(['cash', 'card', 'transfer'] as const).map(method => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentOption,
                        selectedPaymentMethod === method && styles.selectedPaymentOption
                      ]}
                      onPress={() => setSelectedPaymentMethod(method)}
                    >
                      <Text style={[
                        styles.paymentOptionText,
                        selectedPaymentMethod === method && styles.selectedPaymentOptionText
                      ]}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={styles.checkoutSummary}>
                  <Text style={styles.checkoutSummaryTitle}>Order Summary</Text>
                  {cart.map((item, index) => (
                    <View key={index} style={styles.checkoutItem}>
                      <Text style={styles.checkoutItemName}>{item.product.name}</Text>
                      <Text style={styles.checkoutItemDetails}>
                        {item.quantity} x ₦{item.product.price.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.checkoutTotal}>
                    <Text style={styles.checkoutTotalLabel}>Total:</Text>
                    <Text style={styles.checkoutTotalAmount}>₦{getCartTotal().toLocaleString()}</Text>
                  </View>
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={styles.modalCancelButton}
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowCheckout(false);
                    }}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.modalConfirmButton}
                    onPress={() => {
                      Keyboard.dismiss();
                      placeOrderFromCart();
                    }}
                  >
                    <Text style={styles.modalConfirmButtonText}>Place Order</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Product Details Modal */}
      <Modal
        visible={showProductDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductDetails(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowProductDetails(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                {productDetails && (
                  <>
                    <View style={styles.productDetailsHeader}>
                      <View style={styles.productDetailsImage}>
                        <Text style={styles.productDetailsIcon}>💧</Text>
                      </View>
                      <Text style={styles.productDetailsTitle}>{productDetails.name}</Text>
                      <Text style={styles.productDetailsCategory}>{productDetails.category}</Text>
                      <Text style={styles.productDetailsPrice}>₦{productDetails.price.toLocaleString()}</Text>
                    </View>
                    
                    <View style={styles.productDetailsInfo}>
                      <Text style={styles.productDetailsLabel}>Stock Available:</Text>
                      <Text style={styles.productDetailsValue}>{productDetails.stock} units</Text>
                      
                      <Text style={styles.productDetailsLabel}>Supplier:</Text>
                      <Text style={styles.productDetailsValue}>{productDetails.supplier}</Text>
                      
                      {productDetails.description && (
                        <Text style={styles.productDetailsDescription}>
                          {productDetails.description}
                        </Text>
                      )}
                      
                      {productDetails.features && (
                        <View style={styles.productDetailsFeatures}>
                          <Text style={styles.productDetailsFeaturesTitle}>Key Features:</Text>
                          {productDetails.features.map((feature: string, index: number) => (
                            <View key={index} style={styles.productDetailsFeatureItem}>
                              <Text style={styles.productDetailsFeatureIcon}>✓</Text>
                              <Text style={styles.productDetailsFeatureText}>{feature}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      <View style={styles.productDetailsPricing}>
                        <Text style={styles.productDetailsPricingLabel}>Pricing:</Text>
                        <Text style={styles.productDetailsPricingValue}>₦{productDetails.price.toLocaleString()}</Text>
                        <Text style={styles.productDetailsPricingNote}>
                          {productDetails.stock > 100 ? '✅ In Stock' : '⚠️ Low Stock - Order Soon!'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.productDetailsActions}>
                      <TouchableOpacity 
                        style={styles.addToCartLargeButton}
                        onPress={() => {
                          addToCart(productDetails);
                          setShowProductDetails(false);
                        }}
                      >
                        <Text style={styles.addToCartLargeButtonText}>Add to Cart</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.closeDetailsButton}
                        onPress={() => setShowProductDetails(false)}
                      >
                        <Text style={styles.closeDetailsButtonText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Sync Notification Modal */}
      <Modal
        visible={showSyncNotification}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSyncNotification(false)}
      >
        <View style={styles.syncNotificationOverlay}>
          <View style={styles.syncNotificationContent}>
            <Text style={styles.syncNotificationIcon}>🔄</Text>
            <Text style={styles.syncNotificationTitle}>Order Synced!</Text>
            <Text style={styles.syncNotificationMessage}>{syncMessage}</Text>
            <TouchableOpacity 
              style={styles.syncNotificationButton}
              onPress={() => setShowSyncNotification(false)}
            >
              <Text style={styles.syncNotificationButtonText}>Great!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Enhanced Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loginCard: {
    backgroundColor: 'white',
    padding: 30,
    margin: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0EA5E9',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#64748B',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: 'white',
  },
  loginButton: {
    backgroundColor: '#0EA5E9',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  demoCredentials: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 20,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
  },
  demoText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 5,
  },
  roleSelector: {
    marginVertical: 10,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
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
  header: {
    backgroundColor: '#0EA5E9',
    padding: 20,
    paddingTop: 50,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  supportButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  supportButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  supportUnreadBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0EA5E9',
  },
  supportUnreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  adminNav: {
    backgroundColor: 'white',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  activeNavButton: {
    backgroundColor: '#0EA5E9',
  },
  navButtonText: {
    color: '#64748B',
    fontWeight: '500',
  },
  activeNavButtonText: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
  },
  adminContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '48%',
    marginBottom: 15,
  },
  statTitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 5,
  },
  statGrowth: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  fullWidthCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 15,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  alertText: {
    fontSize: 16,
    color: '#1E293B',
    flex: 1,
  },
  alertStock: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  inventoryView: {
    gap: 15,
  },
  inventoryCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  stockIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stockText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  supplierText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 5,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0EA5E9',
    marginBottom: 10,
  },
  stockBar: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  stockFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  ordersView: {
    gap: 15,
  },
  orderCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 5,
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 5,
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 10,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priorityText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  deliveryTime: {
    fontSize: 14,
    color: '#64748B',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  deliveryView: {
    gap: 20,
  },
  deliveryStats: {
    flexDirection: 'row',
    gap: 15,
  },
  deliveryStatCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    flex: 1,
  },
  deliveryStatTitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  deliveryStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 5,
  },
  deliveryStatSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  zonePerformance: {
    gap: 15,
  },
  zoneTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 15,
  },
  zoneCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 10,
  },
  zoneMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zoneMetric: {
    fontSize: 14,
    color: '#64748B',
  },
  zoneGrowth: {
    fontSize: 14,
    fontWeight: '600',
  },
  analyticsView: {
    gap: 20,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  analyticsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '48%',
  },
  analyticsTitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 5,
  },
  analyticsSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 10,
  },
  trendIndicator: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  notificationsView: {
    gap: 15,
  },
  notificationCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  notificationText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  customerContent: {
    gap: 15,
  },
  productCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 10,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 10,
  },
  productStock: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 15,
  },
  orderButton: {
    backgroundColor: '#0EA5E9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  orderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  customerOrders: {
    marginTop: 20,
  },
  customerOrderCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 15,
  },
  customerOrderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  customerOrderDetails: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 5,
  },
  customerOrderStatus: {
    fontSize: 14,
    color: '#0EA5E9',
    fontWeight: '500',
    marginBottom: 5,
  },
  customerOrderDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalProductName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 5,
  },
  modalProductPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0EA5E9',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 15,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white',
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  paymentOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  selectedPaymentOption: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  paymentOptionText: {
    color: '#64748B',
    fontWeight: '500',
  },
  selectedPaymentOptionText: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 25,
  },
  
  // Order Details Modal Styles
  orderDetailsScroll: {
    maxHeight: 400,
    marginBottom: 20,
  },
  orderDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderDetailsNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  orderDetailsStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  orderDetailsStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetailsDate: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  orderDetailsSection: {
    marginBottom: 20,
  },
  orderDetailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 10,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  orderItemDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  orderItemQuantity: {
    alignItems: 'flex-end',
  },
  orderItemQtyText: {
    fontSize: 12,
    color: '#64748B',
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  orderSummaryLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  orderSummaryValue: {
    fontSize: 14,
    color: '#1E293B',
  },
  orderTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 8,
    paddingTop: 8,
  },
  orderTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  orderTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  deliveryInfoLabel: {
    fontSize: 14,
    color: '#64748B',
    width: 80,
  },
  deliveryInfoValue: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  modalCancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#0EA5E9',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Delivery Management Styles
  driverSection: {
    marginBottom: 25,
  },
  subsectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 15,
  },
  driverScroll: {
    marginBottom: 10,
  },
  driverCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginRight: 15,
    width: 200,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  driverStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  driverStatusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
  driverVehicle: {
    fontSize: 14,
    color: '#0EA5E9',
    fontWeight: '500',
    marginBottom: 5,
  },
  driverZone: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 5,
  },
  driverRating: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
    marginBottom: 5,
  },
  driverDeliveries: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  driverActionButton: {
    backgroundColor: '#0EA5E9',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  driverActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  routesSection: {
    marginBottom: 25,
  },
  routeCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 15,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  routeStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  routeStatusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  routeDriver: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0EA5E9',
    marginBottom: 5,
  },
  routeZone: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 5,
  },
  routeTime: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 15,
  },
  routeOrders: {
    marginBottom: 15,
  },
  routeOrdersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 10,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stopNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0EA5E9',
    marginRight: 10,
    width: 20,
  },
  stopDetails: {
    flex: 1,
  },
  stopCustomer: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 2,
  },
  stopAddress: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  stopTime: {
    fontSize: 12,
    color: '#0EA5E9',
    fontWeight: '500',
  },
  stopPriority: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  stopPriorityText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
  routeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  routeActionButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  routeActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  scheduleSection: {
    marginBottom: 25,
  },
  scheduleCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleTime: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 15,
  },
  scheduleTimeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  scheduleDetails: {
    flex: 1,
  },
  scheduleZone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  scheduleDriver: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  scheduleOrders: {
    fontSize: 12,
    color: '#0EA5E9',
    fontWeight: '500',
  },
  scheduleStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scheduleStatusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
  quickActionsSection: {
    marginBottom: 25,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: '48%',
  },
  quickActionText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Clustering Styles
  clusteringSection: {
    marginBottom: 25,
  },
  clusteringInfo: {
    backgroundColor: '#F0F9FF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  clusteringText: {
    fontSize: 14,
    color: '#0C4A6E',
    marginBottom: 8,
    textAlign: 'center',
  },
  clusteringStats: {
    fontSize: 12,
    color: '#0369A1',
    textAlign: 'center',
    fontWeight: '500',
  },
  clusterButton: {
    backgroundColor: '#059669',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  clusterButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  clusteringGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  clusterInfo: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  clusterInfoText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Enhanced Customer UI Styles
  customerHeader: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 22,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 20,
  },
  
  // Support Chat Button Styles
  supportChatSection: {
    marginBottom: 25,
  },
  supportChatButton: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  supportChatIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  supportChatIconText: {
    fontSize: 24,
  },
  supportChatInfo: {
    flex: 1,
  },
  supportChatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  supportChatSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  supportChatArrow: {
    marginLeft: 10,
  },
  supportChatArrowText: {
    fontSize: 20,
    color: '#0EA5E9',
    fontWeight: 'bold',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  productsSection: {
    marginBottom: 25,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 5,
  },
  productsScroll: {
    marginBottom: 10,
  },
  enhancedProductCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginRight: 20,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  productImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  productIcon: {
    fontSize: 40,
  },
  stockBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  productStockText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  productInfo: {
    alignItems: 'center',
  },
  productCategory: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  productActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  detailsButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: 'white',
  },
  detailsButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  quickOrderSection: {
    marginBottom: 25,
  },
  quickOrderHeader: {
    marginBottom: 15,
  },
  quickOrderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 5,
  },
  quickOrderSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  quickOrderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickOrderInfo: {
    flex: 1,
  },
  quickOrderProduct: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 5,
  },
  quickOrderPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 8,
  },
  quickOrderDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  quickOrderButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  quickOrderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  ordersSection: {
    marginBottom: 25,
  },
  orderHistoryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  customerOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderNumber: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  orderNumberText: {
    color: '#0EA5E9',
    fontSize: 14,
    fontWeight: '600',
  },
  orderStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  orderStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  orderContent: {
    marginBottom: 15,
  },
  orderProduct: {
    marginBottom: 10,
  },
  orderProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 5,
  },
  orderProductDetails: {
    fontSize: 14,
    color: '#64748B',
  },
  orderMeta: {
    flexDirection: 'row',
    gap: 20,
  },
  customerOrderMetaDate: {
    fontSize: 12,
    color: '#64748B',
  },
  orderTime: {
    fontSize: 12,
    color: '#64748B',
  },
  customerOrderActions: {
    flexDirection: 'row',
    gap: 10,
  },
  trackButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  trackButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  reorderButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  reorderButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  emptyActionButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  emptyActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  offersSection: {
    marginBottom: 25,
  },
  offerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  offerBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  offerBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  offerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 10,
  },
  offerDescription: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 20,
  },
  offerButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  offerButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Enhanced Customer Navigation Styles
  customerNav: {
    backgroundColor: 'white',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 15,
  },
  cartButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Products View Styles
  productsView: {
    flex: 1,
    padding: 20,
  },
  productsHeader: {
    marginBottom: 25,
    alignItems: 'center',
  },
  productsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  productsSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  searchSection: {
    marginBottom: 25,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 18,
    color: '#9CA3AF',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 16,
    color: '#1F2937',
  },
  clearSearchButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  clearSearchText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  categoryScroll: {
    marginBottom: 20,
  },
  categoryScrollContent: {
    paddingHorizontal: 5,
  },
  categoryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 25,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeCategoryButton: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.3,
  },
  categoryButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  activeCategoryButtonText: {
    color: 'white',
  },
  resultsCount: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  productGridCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minHeight: 320,
  },
  addToCartButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  
  // Enhanced Product Display Styles
  lowStockIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lowStockText: {
    fontSize: 12,
    color: '#D97706',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  productCategoryContainer: {
    marginBottom: 8,
  },
  productGridCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  noProductsFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noProductsIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  noProductsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  noProductsSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  resetFiltersButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  resetFiltersButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  productDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  productFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 15,
  },
  featureTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featureText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '500',
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  viewDetailsButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewDetailsButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Cart View Styles
  cartView: {
    flex: 1,
    padding: 20,
  },
  cartHeader: {
    marginBottom: 20,
  },
  cartTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 5,
  },
  cartSubtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  emptyCart: {
    alignItems: 'center',
    padding: 40,
  },
  emptyCartIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyCartTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyCartSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 25,
  },
  emptyCartButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  emptyCartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cartItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cartItemImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cartItemIcon: {
    fontSize: 24,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 5,
  },
  cartItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 10,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  quantityButton: {
    backgroundColor: '#F1F5F9',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748B',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    padding: 10,
  },
  removeButtonText: {
    fontSize: 18,
  },
  cartSummary: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cartTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  cartTotalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0EA5E9',
  },
  checkoutButton: {
    backgroundColor: '#059669',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Profile View Styles
  profileView: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: '#64748B',
  },
  profileStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 30,
  },
  profileStat: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  profileStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 5,
  },
  profileStatLabel: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  profileActions: {
    gap: 15,
  },
  profileActionButton: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  profileActionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    textAlign: 'center',
  },
  
  // Checkout Modal Styles
  checkoutSummary: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  checkoutSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 10,
  },
  checkoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  checkoutItemName: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  checkoutItemDetails: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  checkoutTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  checkoutTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  checkoutTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0EA5E9',
  },
  
  // Product Details Modal Styles
  productDetailsHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  productDetailsImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  productDetailsIcon: {
    fontSize: 50,
  },
  productDetailsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  productDetailsCategory: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  productDetailsPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 10,
  },
  productDetailsInfo: {
    marginBottom: 25,
  },
  productDetailsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 5,
  },
  productDetailsValue: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 15,
  },
  productDetailsDescription: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  productDetailsFeatures: {
    marginBottom: 20,
  },
  productDetailsFeaturesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 10,
  },
  productDetailsFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productDetailsFeatureIcon: {
    fontSize: 16,
    color: '#10B981',
    marginRight: 10,
    fontWeight: 'bold',
  },
  productDetailsFeatureText: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  productDetailsPricing: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productDetailsPricingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 5,
  },
  productDetailsPricingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 8,
  },
  productDetailsPricingNote: {
    fontSize: 12,
    color: '#059669',
    fontStyle: 'italic',
  },
  productDetailsActions: {
    gap: 15,
  },
  addToCartLargeButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  addToCartLargeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  closeDetailsButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeDetailsButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Featured Products Styles
  featuredProductsSection: {
    marginBottom: 25,
  },
  featuredProductsScroll: {
    marginBottom: 15,
  },
  featuredProductCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 15,
    marginRight: 15,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  featuredProductImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
    position: 'relative',
  },
  featuredProductIcon: {
    fontSize: 40,
  },
  featuredStockBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  featuredStockText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  featuredProductInfo: {
    alignItems: 'center',
  },
  featuredProductTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  featuredProductPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 12,
  },
  featuredAddToCartButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    width: '100%',
  },
  featuredAddToCartButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Sync Status & Recent Orders Styles
  syncStatusCard: {
    backgroundColor: '#F0F9FF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0EA5E9',
  },
  syncStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  syncStatusIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  syncStatusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0EA5E9',
  },
  syncStatusSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 15,
    lineHeight: 20,
  },
  syncStats: {
    flexDirection: 'row',
    gap: 20,
  },
  syncStat: {
    alignItems: 'center',
  },
  syncStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0EA5E9',
  },
  syncStatLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  recentOrdersCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 15,
  },
  recentOrderItem: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recentOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentOrderInfo: {
    flex: 1,
  },
  recentOrderCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  recentOrderEmail: {
    fontSize: 12,
    color: '#64748B',
  },
  recentOrderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recentOrderStatusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  recentOrderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentOrderItems: {
    fontSize: 14,
    color: '#64748B',
  },
  recentOrderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0EA5E9',
  },
  recentOrderMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  recentOrderDate: {
    fontSize: 12,
    color: '#64748B',
  },
  recentOrderTime: {
    fontSize: 12,
    color: '#64748B',
  },
  recentOrderAddress: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  
  // Sync Notification Styles
  syncNotificationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncNotificationContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  syncNotificationIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  syncNotificationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0EA5E9',
    marginBottom: 15,
    textAlign: 'center',
  },
  syncNotificationMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  syncNotificationButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  syncNotificationButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Refresh Button Styles
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  lastSyncText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  
  // Enhanced Admin Order Card Styles
  enhancedOrderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  orderIdSection: {
    flex: 1,
  },
  adminOrderDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  orderCustomerInfo: {
    marginBottom: 15,
  },
  customerEmail: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderItems: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  confirmButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deliveryButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  deliveryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deliveredButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  deliveredButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deliveredStatus: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  deliveredStatusText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  assignDriverButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  assignDriverButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Inventory Management Styles
  addProductButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignSelf: 'center',
  },
  addProductButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  inventoryDetails: {
    marginBottom: 15,
  },
  categoryText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  minStockText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  inventoryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  editButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Order Edit Styles
  editOrderButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  editOrderButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Enhanced Order Management Styles
  deliveryInfo: {
    marginBottom: 15,
  },
  deliveryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  // Order Notes Styles
  orderNotes: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#0EA5E9',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0EA5E9',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  // Simplified Product Card Styles
  simpleProductCard: {
    backgroundColor: 'white',
    width: '48%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  simpleProductTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  simpleProductThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleProductInfo: {
    flex: 1,
    marginLeft: 10,
  },
  simpleProductTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  simpleProductPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0EA5E9',
  },
  simpleProductStock: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  simpleProductActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyButton: {
    backgroundColor: '#F1F5F9',
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: {
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  qtyValue: {
    width: 32,
    textAlign: 'center',
    fontWeight: '700',
    color: '#0F172A',
  },
  simpleAddButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  simpleAddButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },
  
  // Professional Chat Styles
  chatModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
    paddingTop: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  chatSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  chatCloseButton: {
    backgroundColor: '#F1F5F9',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatCloseText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  
  // Notification Styles
  notificationBanner: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#059669',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  notificationTapHint: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.8,
    fontStyle: 'italic',
  },
  notificationClose: {
    marginLeft: 12,
    padding: 4,
  },
  notificationCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatMessagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatMessagesList: {
    paddingVertical: 16,
  },
  chatLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  chatLoadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  chatEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  chatEmptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  chatEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  chatEmptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  chatMessageWrapper: {
    marginBottom: 12,
  },
  chatMessageWrapperSent: {
    alignItems: 'flex-end',
  },
  chatMessageWrapperReceived: {
    alignItems: 'flex-start',
  },
  chatMessage: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  chatMessageSent: {
    backgroundColor: '#0EA5E9',
    borderBottomRightRadius: 4,
  },
  chatMessageReceived: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  chatSenderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  chatMessageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  chatMessageTextSent: {
    color: 'white',
  },
  chatMessageTextReceived: {
    color: '#0F172A',
  },
  chatMessageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  chatMessageTimeSent: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  chatMessageTimeReceived: {
    color: '#9CA3AF',
  },
  chatInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  chatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatTextInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
    color: '#0F172A',
  },
  chatSendButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 8,
  },
  chatSendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  chatSendButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Missing styles
  switchAuth: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchAuthText: {
    color: '#0EA5E9',
    fontSize: 16,
    fontWeight: '600',
  },
  profileForm: {
    marginBottom: 20,
  },
  profileFormLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 15,
  },
  
  // Professional Order Styles
  professionalOrdersHeader: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  ordersHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ordersHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  ordersHeaderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  modernRefreshButton: {
    backgroundColor: '#F3F4F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernRefreshButtonText: {
    fontSize: 18,
  },
  ordersListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modernOrderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  modernOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderHeaderLeft: {
    flex: 1,
  },
  modernOrderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modernOrderDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  modernOrderStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modernOrderStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  modernOrderContent: {
    padding: 16,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderItemsInfo: {
    flex: 1,
  },
  orderItemsCount: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  modernOrderTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0EA5E9',
    marginTop: 4,
  },
  modernDeliveryInfo: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  deliveryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  modernDeliveryAddress: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  modernDeliveryPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  orderProgress: {
    marginBottom: 16,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressStep: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepCompleted: {
    backgroundColor: '#10B981',
  },
  progressStepCurrent: {
    backgroundColor: '#0EA5E9',
  },
  progressStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  progressStepTextCompleted: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  progressLineCompleted: {
    backgroundColor: '#10B981',
  },
  progressLabel: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modernOrderActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  modernChatButton: {
    flex: 1,
    backgroundColor: '#0EA5E9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modernChatButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  modernDetailsButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modernDetailsButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  modernReorderButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modernReorderButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  modernEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  modernEmptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  modernEmptyStateIconText: {
    fontSize: 32,
  },
  modernEmptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modernEmptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  modernEmptyStateButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  modernEmptyStateButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  
  // Admin Chat Button Styles
  adminChatButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  adminChatButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  adminChatButtonSecondary: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  adminChatButtonSecondaryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  supportInboxHelp: {
    fontSize: 14,
    color: '#6B7280',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    lineHeight: 20,
  },
  debugInfo: {
    fontSize: 12,
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
    padding: 8,
    marginTop: 8,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
});