/**
 * ZADA Water Delivery - Production Application
 * Enterprise-grade water delivery platform with comprehensive features
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Services
import { authService, AuthUser } from './src/services/auth';
import { notificationService, Notification } from './src/services/notification.simple';
import { databaseService } from './src/services/database';
import { dataManager } from './src/services/dataManager';
import { useDataManager } from './src/hooks/useDataManager';
import { storage } from './storageUtils';

// Components
import StableInput from './src/components/StableInput';

// Types
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  sku: string;
  category_id: string;
  supplier_id: string;
  stock_quantity: number;
  min_stock_level: number;
  max_stock_level: number;
  images: string[];
  features: string[];
  specifications: Record<string, any>;
  status: 'active' | 'inactive' | 'discontinued';
  created_at: string;
  updated_at: string;
  categories?: { name: string };
  suppliers?: { name: string; contact_person: string };
}

interface Order {
  id: string;
  customer_id: string;
  order_number: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'mobile_money';
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  shipping_address: any;
  billing_address: any;
  created_at: string;
  updated_at: string;
  shipped_at?: string;
  delivered_at?: string;
  order_items?: OrderItem[];
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products?: Product;
}

interface CartItem {
  product: Product;
  quantity: number;
  addedAt: Date;
}

// Constants
const COLORS = {
  primary: '#2563EB',
  secondary: '#64748B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#F8FAFC',
  white: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  text: '#1E293B',
  gray: '#64748B',
  border: '#E2E8F0',
  gradient: ['#2563EB', '#1D4ED8'] as const,
};

const TYPOGRAPHY = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');


// Top-level, stable Product Modal component
const ProductModalComponent = React.memo(function ProductModalComponent({
  visible,
  productForm,
  editingProduct,
  onClose,
  onSave,
}: any) {
  // Local state to prevent re-renders from parent
  const [localForm, setLocalForm] = React.useState(productForm);

  // Initialize local form when modal opens or editing target changes
  React.useEffect(() => {
    if (visible) {
      setLocalForm(productForm);
    }
  }, [visible, editingProduct]);

  // Local handlers only update localForm to avoid parent re-render during typing
  const handleNameChange = React.useCallback((text: string) => {
    setLocalForm(prev => ({ ...prev, name: text }));
  }, []);

  const handleDescriptionChange = React.useCallback((text: string) => {
    setLocalForm(prev => ({ ...prev, description: text }));
  }, []);

  const handlePriceChange = React.useCallback((text: string) => {
    setLocalForm(prev => ({ ...prev, price: text }));
  }, []);

  const handleStockChange = React.useCallback((text: string) => {
    setLocalForm(prev => ({ ...prev, stock: text }));
  }, []);

  const handleMinStockChange = React.useCallback((text: string) => {
    setLocalForm(prev => ({ ...prev, minStock: text }));
  }, []);

  const handleFeaturesChange = React.useCallback((text: string) => {
    setLocalForm(prev => ({ ...prev, features: text }));
  }, []);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Product Name *</Text>
            <StableInput
              style={styles.input}
              onChangeText={handleNameChange}
              placeholder="Enter product name"
              value={localForm.name || ''}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description *</Text>
            <StableInput
              style={[styles.input, styles.textArea]}
              onChangeText={handleDescriptionChange}
              placeholder="Enter product description"
              value={localForm.description || ''}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Price (₦) *</Text>
              <StableInput
                style={styles.input}
                onChangeText={handlePriceChange}
                placeholder="0.00"
                value={localForm.price || ''}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Stock Quantity</Text>
              <StableInput
                style={styles.input}
                onChangeText={handleStockChange}
                placeholder="0"
                value={localForm.stock || ''}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Min Stock Level</Text>
              <StableInput
                style={styles.input}
                onChangeText={handleMinStockChange}
                placeholder="0"
                value={localForm.minStock || ''}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Features (comma-separated)</Text>
            <StableInput
              style={[styles.input, styles.textArea]}
              onChangeText={handleFeaturesChange}
              placeholder="Feature 1, Feature 2, Feature 3"
              value={localForm.features || ''}
              multiline
              numberOfLines={2}
            />
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => onSave(localForm)}
          >
            <Text style={styles.saveButtonText}>
              {editingProduct ? 'Update Product' : 'Add Product'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

// Top-level, stable Chat Modal component
const ChatModalComponent = React.memo(function ChatModalComponent({
  visible,
  user,
  chatWithUser,
  chatMessages,
  newMessage,
  onChangeMessage,
  onSend,
  onClose,
}: any) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {user?.role === 'admin' && chatWithUser 
              ? `Chat with ${chatWithUser.profile?.first_name || 'Customer'}`
              : 'Support Chat'
            }
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.chatMessages} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {chatMessages.map((message: any) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.sender_id === user?.id ? styles.myMessage : styles.otherMessage
              ]}
            >
              <Text style={styles.messageText}>{message.content}</Text>
              <Text style={styles.messageTime}>
                {new Date(message.created_at).toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.chatInput}>
          <StableInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={onChangeMessage}
            placeholder="Type your message..."
            multiline
            maxLength={500}
            blurOnSubmit={false}
            selectTextOnFocus={false}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={onSend}
            disabled={!newMessage.trim()}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={newMessage.trim() ? COLORS.white : COLORS.gray} 
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

// Stable Admin Inventory view (module scope)
const AdminInventoryViewComponent = React.memo(function AdminInventoryViewComponent({
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
}: any) {
  return (
    <View style={styles.viewContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.viewTitle}>Inventory Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddProduct}>
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.productsList} keyboardShouldPersistTaps="handled">
        {(products || []).map((product: any) => (
          <View key={product.id} style={styles.productItem}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productDescription}>{product.description}</Text>
              <Text style={styles.productPrice}>₦{product.price.toLocaleString()}</Text>
              <Text style={styles.productStock}>
                Stock: {product.stock_quantity} (Min: {product.min_stock_level})
              </Text>
            </View>
            <View style={styles.productActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onEditProduct(product)}
              >
                <Ionicons name="create" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => onDeleteProduct(product.id)}
              >
                <Ionicons name="trash" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

// Stable Support Chat list view (module scope)
const ChatViewComponent = React.memo(function ChatViewComponent({
  user,
  onOpenChat,
}: any) {
  const [recentMessages, setRecentMessages] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (user) {
      loadRecentMessages();
    }
  }, [user?.id]);

  const loadRecentMessages = async () => {
    try {
      const messagesData = await storage.getItem('@zada_chat_messages');
      if (messagesData) {
        const allMessages = JSON.parse(messagesData);
        const supportMessages = allMessages.filter((msg: any) => msg.type === 'support' && (msg.sender_id === user?.id || msg.recipient_id === user?.id));
        const conversations = supportMessages.reduce((acc: any, msg: any) => {
          const otherUserId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
          if (!acc[otherUserId]) {
            acc[otherUserId] = { lastMessage: msg, unreadCount: 0 };
          }
          if (msg.sender_id !== user?.id && msg.status === 'unread') acc[otherUserId].unreadCount++;
          if (new Date(msg.created_at) > new Date(acc[otherUserId].lastMessage.created_at)) acc[otherUserId].lastMessage = msg;
          return acc;
        }, {});
        const sortedConversations = Object.entries(conversations)
          .map(([userId, data]: any) => ({ user: { id: userId }, last: data.lastMessage.content, unread: data.unreadCount }))
          .sort((a: any, b: any) => (a.last?.created_at || 0) < (b.last?.created_at || 0) ? 1 : -1);
        setRecentMessages(sortedConversations);
        setUnreadCount(sortedConversations.reduce((sum: number, c: any) => sum + (c.unread || 0), 0));
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <View style={styles.viewContainer}>
      <Text style={styles.viewTitle}>Support</Text>
      <ScrollView style={styles.recentChats} keyboardShouldPersistTaps="handled">
        {recentMessages.length > 0 ? (
          recentMessages.map((conversation: any, index: number) => (
            <TouchableOpacity
              key={index}
              style={styles.conversationItem}
              onPress={() => onOpenChat(conversation.user)}
            >
              <Text style={styles.conversationTitle}>{conversation.user?.profile?.first_name || 'User'}</Text>
              <Text style={styles.conversationSnippet} numberOfLines={1}>{conversation.last}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>No recent chats.</Text>
          </View>
        )}
      </ScrollView>
      <TouchableOpacity style={styles.chatFab} onPress={() => onOpenChat(null)}>
        <Ionicons name="chatbubbles" size={24} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
});
export default function App() {
  // Authentication state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Use centralized data manager
  const {
    products,
    orders,
    cart,
    customers,
    notifications,
    loading: dataLoading,
    error: dataError,
    initialize: initializeData,
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
    getOrdersByUser,
    getNotificationsByUser,
    getUnreadNotificationCount,
    cartTotal,
    cartItemCount
  } = useDataManager();
  
  // UI state
  const [currentView, setCurrentView] = useState<'dashboard' | 'inventory' | 'orders' | 'analytics' | 'customers' | 'chat'>('dashboard');
  const [customerView, setCustomerView] = useState<'home' | 'products' | 'cart' | 'orders' | 'profile' | 'chat'>('home');
  const [isRegistering, setIsRegistering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  
  // Product management state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    minStock: '',
    features: '',
  });

  // Stable product form handlers
  const handleProductNameChange = useCallback((text: string) => {
    setProductForm(prev => ({ ...prev, name: text }));
  }, []);

  const handleProductDescriptionChange = useCallback((text: string) => {
    setProductForm(prev => ({ ...prev, description: text }));
  }, []);

  const handleProductPriceChange = useCallback((text: string) => {
    setProductForm(prev => ({ ...prev, price: text }));
  }, []);

  const handleProductStockChange = useCallback((text: string) => {
    setProductForm(prev => ({ ...prev, stock: text }));
  }, []);

  const handleProductMinStockChange = useCallback((text: string) => {
    setProductForm(prev => ({ ...prev, minStock: text }));
  }, []);

  const handleProductFeaturesChange = useCallback((text: string) => {
    setProductForm(prev => ({ ...prev, features: text }));
  }, []);

  // Stable chat message handler
  const handleNewMessageChange = useCallback((text: string) => {
    setNewMessage(text);
  }, []);

  // Stable edit form handlers
  const handleEditFirstNameChange = useCallback((text: string) => {
    setEditForm(prev => ({ ...prev, first_name: text }));
  }, []);

  const handleEditLastNameChange = useCallback((text: string) => {
    setEditForm(prev => ({ ...prev, last_name: text }));
  }, []);

  const handleEditPhoneChange = useCallback((text: string) => {
    setEditForm(prev => ({ ...prev, phone: text }));
  }, []);

  const handleEditAddressChange = useCallback((text: string) => {
    setEditForm(prev => ({ ...prev, address: text }));
  }, []);

  // Stable search handler
  const handleSearchQueryChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Chat state
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatWithUser, setChatWithUser] = useState<AuthUser | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    role: 'customer' as 'customer' | 'admin',
    termsAccepted: false,
  });

  // Individual state for each input to prevent focus loss
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);

  // Clear form function
  const clearForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setAddress('');
    setFirstNameValue('');
    setLastNameValue('');
    setEmailValue('');
    setPasswordValue('');
    setPhoneValue('');
    setAddressValue('');
    setShowPassword(false);
  };

  // Stable onChange handlers to prevent re-renders
  const handleFirstNameChange = useCallback((text: string) => {
    setFirstName(text);
  }, []);

  const handleLastNameChange = useCallback((text: string) => {
    setLastName(text);
  }, []);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
  }, []);

  const handlePhoneChange = useCallback((text: string) => {
    setPhone(text);
  }, []);

  const handleAddressChange = useCallback((text: string) => {
    setAddress(text);
  }, []);

  // Refs for input fields to prevent focus loss
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);

  // Uncontrolled input values for better focus management
  const [firstNameValue, setFirstNameValue] = useState('');
  const [lastNameValue, setLastNameValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [addressValue, setAddressValue] = useState('');

  // Load initial data
  useEffect(() => {
    const initializeAppData = async () => {
      try {
        console.log('=== APP INITIALIZATION ===');
        await authService.initialize();
        await initializeData();
        await initializeApp();
        console.log('App initialization completed');
        
        // Add debug functions to window for testing
        (window as any).debugAuth = {
          createAdmin: async (email: string, firstName: string, lastName: string) => {
            try {
              const admin = await authService.createAdminUser({
                email,
                profile: { first_name: firstName, last_name: lastName }
              });
              console.log('✅ Admin created:', admin);
              return admin;
            } catch (error) {
              console.error('❌ Error creating admin:', error);
              return null;
            }
          },
          getAllUsers: async () => {
            const users = await databaseService.getAllUsers();
            console.log('👥 All users:', users);
            return users;
          },
          clearData: async () => {
            await databaseService.clearAllData();
            console.log('🗑️ Data cleared');
          }
        };
        console.log('🔧 Debug functions available: window.debugAuth');
      } catch (error) {
        console.error('Error during app initialization:', error);
      }
    };
    
    initializeAppData();
  }, []);

  // Load notifications when user changes
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  // Load sample data for demonstration
  const loadSampleData = async () => {
    try {
      // Load sample products if none exist
      const existingProducts = await storage.getItem('@zada_products');
      if (!existingProducts || JSON.parse(existingProducts).length === 0) {
        const sampleProducts: Product[] = [
          {
            id: 'prod_1',
            sku: 'SKU-001',
            name: 'Premium Water 500ml',
            description: 'High-quality purified water in convenient 500ml bottles',
            price: 150,
            cost: 100,
            stock_quantity: 100,
            min_stock_level: 20,
            max_stock_level: 200,
            status: 'active',
            category_id: 'cat_1',
            supplier_id: 'sup_1',
            features: ['Purified', 'BPA-free bottle', 'Convenient size'],
            images: [],
            specifications: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            categories: { name: 'Water Products' },
            suppliers: { name: 'ZADA Suppliers', contact_person: 'Admin' }
          },
          {
            id: 'prod_2',
            sku: 'SKU-002',
            name: 'Premium Water 1L',
            description: 'High-quality purified water in 1-liter bottles',
            price: 250,
            cost: 180,
            stock_quantity: 80,
            min_stock_level: 15,
            max_stock_level: 150,
            status: 'active',
            category_id: 'cat_1',
            supplier_id: 'sup_1',
            features: ['Purified', 'BPA-free bottle', 'Family size'],
            images: [],
            specifications: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            categories: { name: 'Water Products' },
            suppliers: { name: 'ZADA Suppliers', contact_person: 'Admin' }
          },
          {
            id: 'prod_3',
            sku: 'SKU-003',
            name: 'Premium Water 5L',
            description: 'High-quality purified water in 5-liter containers',
            price: 800,
            cost: 600,
            stock_quantity: 50,
            min_stock_level: 10,
            max_stock_level: 100,
            status: 'active',
            category_id: 'cat_1',
            supplier_id: 'sup_1',
            features: ['Purified', 'BPA-free container', 'Bulk size'],
            images: [],
            specifications: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            categories: { name: 'Water Products' },
            suppliers: { name: 'ZADA Suppliers', contact_person: 'Admin' }
          }
        ];
        setProducts(sampleProducts);
        await storage.setItem('@zada_products', JSON.stringify(sampleProducts));
      }

      // Load sample customers if none exist
      const existingCustomers = await storage.getItem('@zada_customers');
      console.log('Existing customers data:', existingCustomers);
      
      if (!existingCustomers || JSON.parse(existingCustomers).length === 0) {
        console.log('Creating sample customers including admin...');
        const sampleCustomers: AuthUser[] = [
          {
            id: 'customer_1',
            email: 'john.doe@example.com',
            role: 'customer',
            profile: {
              first_name: 'John',
              last_name: 'Doe',
              phone: '+2348012345678',
              address: '123 Main Street, Lagos'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'customer_2',
            email: 'jane.smith@example.com',
            role: 'customer',
            profile: {
              first_name: 'Jane',
              last_name: 'Smith',
              phone: '+2348098765432',
              address: '456 Oak Avenue, Abuja'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'admin_1',
            email: 'admin@zadafoods.com',
            role: 'admin',
            profile: {
              first_name: 'Admin',
              last_name: 'User',
              phone: '+2348012345680',
              address: 'ZADA Foods Headquarters'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        console.log('Sample customers created:', sampleCustomers);
        setCustomers(sampleCustomers);
        await storage.setItem('@zada_customers', JSON.stringify(sampleCustomers));
        console.log('Sample customers saved to storage');
      } else {
        console.log('Loading existing customers from storage');
        const existingUsers = JSON.parse(existingCustomers);
        setCustomers(existingUsers);
        console.log('Loaded customers:', existingUsers);
      }

      // Load sample orders if none exist
      const existingOrders = await storage.getItem('@zada_orders');
      if (!existingOrders || JSON.parse(existingOrders).length === 0) {
        const sampleOrders = [
          {
            id: 'order_1',
            customer_id: 'customer_1',
            customer_name: 'John Doe',
            customer_email: 'john.doe@example.com',
            items: [
              {
                product: {
                  id: 'prod_1',
                  name: 'Premium Water 500ml',
                  price: 150
                },
                quantity: 2,
                price: 150
              }
            ],
            total_amount: 300,
            payment_method: 'cash_on_delivery',
            payment_status: 'pending',
            status: 'pending',
            created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            updated_at: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: 'order_2',
            customer_id: 'customer_2',
            customer_name: 'Jane Smith',
            customer_email: 'jane.smith@example.com',
            items: [
              {
                product: {
                  id: 'prod_2',
                  name: 'Premium Water 1L',
                  price: 250
                },
                quantity: 1,
                price: 250
              }
            ],
            total_amount: 250,
            payment_method: 'online',
            payment_status: 'paid',
            status: 'delivered',
            created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            updated_at: new Date(Date.now() - 86400000).toISOString()
          }
        ];
        setOrders(sampleOrders);
        await storage.setItem('@zada_orders', JSON.stringify(sampleOrders));
      }
    } catch (error) {
      console.error('Error loading sample data:', error);
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    if (user) {
      setupRealtimeSubscriptions();
    }
  }, [user]);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      
      // Check authentication
      const currentUser = await authService.validateSession();
      if (currentUser) {
        setUser(currentUser);
        await loadUserData(currentUser);
      }
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async (user: AuthUser) => {
    try {
      // Load products
      const productsData = await databaseService.getAllProducts();
      setProducts(productsData);
      
      // Load orders
      const allOrders = await databaseService.getAllOrders();
      const ordersData = user.role === 'customer' ? allOrders.filter(o => o.customer_id === user.id) : allOrders;
      setOrders(ordersData);
      
      // Load notifications
      const notificationsData = await notificationService.getUserNotifications(user.id, { limit: 20 });
      setNotifications(notificationsData);
      
      // Get unread count
      const unreadCountData = await notificationService.getUnreadCount(user.id);
      setUnreadCount(unreadCountData);
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;
    
    // Subscribe to notifications
    const notificationSubscription = notificationService.subscribeToNotifications(
      user.id,
      (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show notification alert
        Alert.alert(notification.title, notification.content);
      }
    );
    
    // Cleanup on unmount
    return () => {
      notificationService.unsubscribeFromNotifications(notificationSubscription);
    };
  };


  const handleLogin = async () => {
    // Validation
    if (!email?.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return;
    }
    if (!password?.trim()) {
      Alert.alert('Validation Error', 'Password is required');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setIsAuthenticating(true);
      
      console.log('=== LOGIN DEBUG ===');
      console.log('Attempting login with email:', email);
      
      // Use the new auth service
      const loggedInUser = await authService.login(email, password);
      
      if (loggedInUser) {
        console.log('Login successful:', loggedInUser);
        setUser(loggedInUser);
        await loadUserData(loggedInUser);
        
        const roleText = loggedInUser.role === 'admin' ? 'Admin' : 'User';
        Alert.alert('Success', `Welcome back, ${roleText} ${loggedInUser.profile?.first_name || 'User'}!`);
      } else {
        console.log('Login failed: Invalid credentials');
        Alert.alert('Login Failed', 'Invalid credentials. Please check your email and password.');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error instanceof Error ? error.message : 'An error occurred. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRegister = async () => {
    // Validation
    if (!firstName?.trim()) {
      Alert.alert('Validation Error', 'First name is required');
      return;
    }
    if (!lastName?.trim()) {
      Alert.alert('Validation Error', 'Last name is required');
      return;
    }
    if (!email?.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return;
    }
    if (!password?.trim()) {
      Alert.alert('Validation Error', 'Password is required');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return;
    }
    if (firstName.length < 2) {
      Alert.alert('Validation Error', 'First name must be at least 2 characters');
      return;
    }
    if (lastName.length < 2) {
      Alert.alert('Validation Error', 'Last name must be at least 2 characters');
      return;
    }
    if (phone && phone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid phone number');
      return;
    }

    if (!formData.termsAccepted) {
      Alert.alert('Terms Required', 'Please accept the terms and conditions');
      return;
    }

    try {
      setIsAuthenticating(true);
      
      console.log('=== REGISTRATION DEBUG ===');
      console.log('Attempting registration with email:', email);
      console.log('Role:', formData.role);
      
      // Use the new auth service
      const newUser = await authService.register({
        email: email.trim().toLowerCase(),
        role: formData.role,
        profile: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone?.trim() || '',
          address: address?.trim() || ''
        }
      });
      
      console.log('Registration successful:', newUser);
      setUser(newUser);
      await loadUserData(newUser);
      
      const roleText = newUser.role === 'admin' ? 'Admin' : 'User';
      Alert.alert('Success', `${roleText} registration successful!`);
      
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', error instanceof Error ? error.message : 'An error occurred. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('=== LOGOUT DEBUG ===');
      console.log('Logging out user:', user?.email);
      
      // Use the new auth service
      await authService.logout();
      
      // Clear all local state
      setUser(null);
      setProducts([]);
      setOrders([]);
      setCart([]);
      setCustomers([]);
      setNotifications([]);
      setChatMessages([]);
      setChatWithUser(null);
      setNewMessage('');
      setShowChatModal(false);
      setShowProductModal(false);
      setEditingProduct(null);
      setCurrentView('dashboard');
      setCustomerView('home');
      setIsRegistering(false);
      setRefreshing(false);
      setShowNotifications(false);
      setShowNotification(false);
      setNotificationMessage('');
      setUnreadMessages(0);
      setUnreadCount(0);
      
      console.log('✅ Logout successful');
      Alert.alert('Success', 'Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user) {
      await loadUserData(user);
    }
    setRefreshing(false);
  }, [user]);

  // Product management functions
  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      price: '',
      stock: '',
      minStock: '',
      features: '',
    });
    setShowProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock_quantity.toString(),
      minStock: product.min_stock_level.toString(),
      features: product.features.join(', '),
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (overrideForm?: {
    name: string;
    description: string;
    price: string;
    stock: string;
    minStock: string;
    features: string;
  }) => {
    // Validation
    const form = overrideForm ?? productForm;
    if (!form.name?.trim()) {
      Alert.alert('Validation Error', 'Product name is required');
      return;
    }
    if (!form.description?.trim()) {
      Alert.alert('Validation Error', 'Product description is required');
      return;
    }
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price greater than 0');
      return;
    }
    if (form.stock && (isNaN(parseInt(form.stock)) || parseInt(form.stock) < 0)) {
      Alert.alert('Validation Error', 'Stock quantity must be a valid number');
      return;
    }
    if (form.minStock && (isNaN(parseInt(form.minStock)) || parseInt(form.minStock) < 0)) {
      Alert.alert('Validation Error', 'Minimum stock level must be a valid number');
      return;
    }

    try {
      const productData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock) || 0,
        min_stock_level: parseInt(form.minStock) || 0,
        features: form.features ? form.features.split(',').map(f => f.trim()).filter(f => f) : [],
        status: 'active' as const,
        created_at: editingProduct?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (editingProduct) {
        // Update existing product
        await updateProduct(editingProduct.id, productData);
        Alert.alert('Success', 'Product updated successfully!');
      } else {
        // Add new product
        const newProductData = {
          ...productData,
          sku: 'SKU-' + Date.now(),
          category_id: 'cat_1',
          supplier_id: 'sup_1',
          cost: productData.price * 0.7, // 30% margin
          max_stock_level: productData.stock_quantity * 2,
          images: [],
          specifications: {},
          categories: { name: 'Water Products' },
          suppliers: { name: 'ZADA Suppliers', contact_person: 'Admin' }
        };
        
        await addProduct(newProductData);
        Alert.alert('Success', 'Product added successfully!');
      }

      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        stock: '',
        minStock: '',
        features: '',
      });
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product. Please try again.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(productId);
              Alert.alert('Success', 'Product deleted successfully!');
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  // Chat functions
  const openChat = (withUser?: AuthUser) => {
    setChatWithUser(withUser || null);
    setShowChatModal(true);
    loadChatMessages();
  };

  const loadChatMessages = async () => {
    try {
      const messagesData = await storage.getItem('@zada_chat_messages');
      const allMessages = messagesData ? JSON.parse(messagesData) : [];
      
      // Filter messages for current chat
      const filteredMessages = allMessages.filter((msg: any) => {
        if (user?.role === 'admin') {
          return msg.type === 'support' || (msg.sender_id === chatWithUser?.id || msg.recipient_id === chatWithUser?.id);
        } else {
          return msg.type === 'support';
        }
      });
      
      setChatMessages(filteredMessages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!user) return;

    const messageContent = newMessage.trim();
    if (messageContent.length > 500) {
      Alert.alert('Message Too Long', 'Please keep messages under 500 characters');
      return;
    }

    try {
      const message = {
        id: 'msg_' + Date.now(),
        sender_id: user.id,
        recipient_id: user.role === 'admin' ? chatWithUser?.id : null,
        type: 'support',
        subject: 'Support Chat',
        content: messageContent,
        status: 'unread',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const messagesData = await storage.getItem('@zada_chat_messages');
      const allMessages = messagesData ? JSON.parse(messagesData) : [];
      allMessages.push(message);
      await storage.setItem('@zada_chat_messages', JSON.stringify(allMessages));

      setChatMessages(prev => [...prev, message]);
      setNewMessage('');

      // Send notification using local system
      try {
        if (user.role === 'customer') {
          // For customers, create a notification for admin (find admin user)
          const adminUser = customers.find(c => c.role === 'admin');
          if (adminUser) {
            await createNotification('message', 'New Message', `You have a new message from ${user.profile?.first_name || 'Customer'}`, adminUser.id);
          }
        } else if (chatWithUser) {
          // For admin, create a notification for the specific customer
          await createNotification('message', 'New Message', `You have a new message from Admin`, chatWithUser.id);
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the message send if notification fails
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // Notification functions
  const showNotificationBanner = (title: string, message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  };

  const createNotification = async (type: string, title: string, message: string, targetUserId?: string) => {
    try {
      const notification = {
        id: 'notif_' + Date.now(),
        type,
        title,
        message,
        userId: targetUserId || user?.id,
        read: false,
        created_at: new Date().toISOString()
      };

      const notificationsData = await storage.getItem('@zada_notifications');
      const existingNotifications = notificationsData ? JSON.parse(notificationsData) : [];
      existingNotifications.push(notification);
      await storage.setItem('@zada_notifications', JSON.stringify(existingNotifications));
      
      // Only update local state if this notification is for the current user
      if (notification.userId === user?.id) {
        setNotifications(prev => [...prev, notification]);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const notificationsData = await storage.getItem('@zada_notifications');
      if (notificationsData) {
        const allNotifications = JSON.parse(notificationsData);
        const userNotifications = allNotifications.filter((notif: any) => notif.userId === user?.id);
        setNotifications(userNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };


  // Show loading screen
  // Modal Components

  const ChatModal = () => (
    <ChatModalComponent
      visible={showChatModal}
      user={user}
      chatWithUser={chatWithUser}
      chatMessages={chatMessages}
      newMessage={newMessage}
      onChangeMessage={handleNewMessageChange}
      onSend={sendMessage}
      onClose={() => setShowChatModal(false)}
    />
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading ZADA Water Delivery...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show authentication screen
  if (!user) {
    return AuthenticationScreen();
  }

  // Show customer interface
  if (user.role === 'customer') {
    return (
      <SafeAreaView style={styles.container}>
        {/* Notification Banner */}
        {showNotification && (
          <TouchableOpacity
            style={styles.notificationBanner}
            onPress={() => {
              setShowNotification(false);
              setShowNotifications(true);
            }}
          >
            <Ionicons name="notifications" size={20} color={COLORS.white} />
            <Text style={styles.notificationBannerText}>{notificationMessage}</Text>
            <Ionicons name="close" size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}
        <CustomerInterface />
      </SafeAreaView>
    );
  }

  // Show admin interface
  return (
    <SafeAreaView style={styles.container}>
      {/* Notification Banner */}
      {showNotification && (
        <TouchableOpacity
          style={styles.notificationBanner}
          onPress={() => {
            setShowNotification(false);
            setShowNotifications(true);
          }}
        >
          <Ionicons name="notifications" size={20} color={COLORS.white} />
          <Text style={styles.notificationBannerText}>{notificationMessage}</Text>
          <Ionicons name="close" size={20} color={COLORS.white} />
        </TouchableOpacity>
      )}
      <AdminInterface />
    </SafeAreaView>
  );

  // Authentication Screen Component
  function AuthenticationScreen() {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <LinearGradient colors={COLORS.gradient} style={styles.authGradient}>
          <KeyboardAvoidingView
            style={styles.authContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView contentContainerStyle={styles.authScrollContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.authHeader}>
                <Text style={styles.authTitle}>ZADA Water Delivery</Text>
                <Text style={styles.authSubtitle}>
                  {isRegistering ? 'Create your account' : 'Welcome back!'}
                </Text>
              </View>

              <View style={styles.authForm}>
                {isRegistering && (
                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>First Name</Text>
                      <StableInput
                        ref={firstNameRef}
                        style={styles.input}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="Enter your first name"
                        autoCapitalize="words"
                        autoCorrect={false}
                        autoComplete="given-name"
                        returnKeyType="next"
                        onSubmitEditing={() => lastNameRef.current?.focus()}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Last Name</Text>
                      <StableInput
                        ref={lastNameRef}
                        style={styles.input}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Enter your last name"
                        autoCapitalize="words"
                        autoCorrect={false}
                        autoComplete="family-name"
                        returnKeyType="next"
                        onSubmitEditing={() => emailRef.current?.focus()}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <StableInput
                    ref={emailRef}
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <StableInput
                      ref={passwordRef}
                      style={styles.passwordInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      secureTextEntry={!showPassword}
                      autoComplete="current-password"
                      returnKeyType="done"
                      onSubmitEditing={isRegistering ? handleRegister : handleLogin}
                      autoCorrect={false}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off" : "eye"} 
                        size={20} 
                        color={COLORS.gray} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {isRegistering && (
                  <>
                    <View style={styles.roleSelector}>
                      <Text style={styles.roleLabel}>Account Type:</Text>
                      <View style={styles.roleButtons}>
                        <TouchableOpacity
                          style={[
                            styles.roleButton,
                            formData.role === 'customer' && styles.roleButtonActive
                          ]}
                          onPress={() => setFormData(prev => ({ ...prev, role: 'customer' }))}
                        >
                          <Text style={[
                            styles.roleButtonText,
                            formData.role === 'customer' && styles.roleButtonTextActive
                          ]}>
                            Customer
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.roleButton,
                            formData.role === 'admin' && styles.roleButtonActive
                          ]}
                          onPress={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
                        >
                          <Text style={[
                            styles.roleButtonText,
                            formData.role === 'admin' && styles.roleButtonTextActive
                          ]}>
                            Admin
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {formData.role === 'admin' && (
                        <Text style={styles.adminEmailHint}>
                          💡 Admin accounts require @zadafoods.com or @zada.com email address
                        </Text>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Phone (Optional)</Text>
                      <StableInput
                        ref={phoneRef}
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Enter your phone number"
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        returnKeyType="next"
                        onSubmitEditing={() => addressRef.current?.focus()}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Address (Optional)</Text>
                      <StableInput
                        ref={addressRef}
                        style={styles.input}
                        value={address}
                        onChangeText={setAddress}
                        placeholder="Enter your address"
                        multiline
                        numberOfLines={2}
                        autoComplete="street-address"
                        returnKeyType="done"
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.termsContainer}
                      onPress={() => setFormData(prev => ({ ...prev, termsAccepted: !prev.termsAccepted }))}
                    >
                      <View style={[styles.checkbox, formData.termsAccepted && styles.checkboxChecked]}>
                        {formData.termsAccepted && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                      </View>
                      <Text style={styles.termsText}>
                        I agree to the Terms and Conditions and Privacy Policy
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={isRegistering ? handleRegister : handleLogin}
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {isRegistering ? 'Create Account' : 'Sign In'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => {
                    clearForm();
                    setIsRegistering(!isRegistering);
                  }}
                >
                  <Text style={styles.toggleButtonText}>
                    {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Customer Interface Component
  function CustomerInterface() {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>ZADA Water Delivery</Text>
            <Text style={styles.headerSubtitle}>Welcome, {user?.profile?.first_name || 'User'}!</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => setShowNotifications(true)}
            >
              <Ionicons name="notifications" size={24} color={COLORS.white} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
        >
          {customerView === 'home' && <CustomerHomeView />}
          {customerView === 'products' && <CustomerProductsView />}
          {customerView === 'cart' && <CustomerCartView />}
          {customerView === 'orders' && <CustomerOrdersView />}
          {customerView === 'chat' && <ChatView />}
          {customerView === 'profile' && <CustomerProfileView />}
        </ScrollView>

        <View style={styles.bottomNavigation}>
          <TouchableOpacity
            style={[styles.navItem, customerView === 'home' && styles.activeNavItem]}
            onPress={() => setCustomerView('home')}
          >
            <Ionicons name="home" size={24} color={customerView === 'home' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.navText, customerView === 'home' && styles.activeNavText]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, customerView === 'products' && styles.activeNavItem]}
            onPress={() => setCustomerView('products')}
          >
            <Ionicons name="storefront" size={24} color={customerView === 'products' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.navText, customerView === 'products' && styles.activeNavText]}>Products</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, customerView === 'cart' && styles.activeNavItem]}
            onPress={() => setCustomerView('cart')}
          >
            <Ionicons name="cart" size={24} color={customerView === 'cart' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.navText, customerView === 'cart' && styles.activeNavText]}>
              Cart ({cart.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, customerView === 'orders' && styles.activeNavItem]}
            onPress={() => setCustomerView('orders')}
          >
            <Ionicons name="receipt" size={24} color={customerView === 'orders' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.navText, customerView === 'orders' && styles.activeNavText]}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, customerView === 'chat' && styles.activeNavItem]}
            onPress={() => setCustomerView('chat')}
          >
            <Ionicons name="chatbubbles" size={24} color={customerView === 'chat' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.navText, customerView === 'chat' && styles.activeNavText]}>Support</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, customerView === 'profile' && styles.activeNavItem]}
            onPress={() => setCustomerView('profile')}
          >
            <Ionicons name="person" size={24} color={customerView === 'profile' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.navText, customerView === 'profile' && styles.activeNavText]}>Profile</Text>
          </TouchableOpacity>
        </View>

        <NotificationsModal />
        <ProductModalComponent
          visible={showProductModal}
          productForm={productForm}
          editingProduct={editingProduct}
          onClose={() => setShowProductModal(false)}
          onSave={(localForm: any) => handleSaveProduct(localForm)}
        />
        <ChatModal />
      </SafeAreaView>
    );
  }

  // Admin Interface Component
  function AdminInterface() {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome, {user?.profile?.first_name || 'User'}!</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => setShowNotifications(true)}
            >
              <Ionicons name="notifications" size={24} color={COLORS.white} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
        >
          {currentView === 'dashboard' && <AdminDashboardView />}
          {currentView === 'inventory' && <AdminInventoryView />}
          {currentView === 'orders' && <AdminOrdersView />}
          {currentView === 'analytics' && <AdminAnalyticsView />}
          {currentView === 'customers' && <AdminCustomersView />}
          {currentView === 'chat' && <ChatView />}
        </ScrollView>

        <View style={styles.bottomNavigation}>
          <TouchableOpacity
            style={[styles.navItem, currentView === 'dashboard' && styles.activeNavItem]}
            onPress={() => setCurrentView('dashboard')}
          >
            <Ionicons name="grid" size={24} color={currentView === 'dashboard' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.navText, currentView === 'dashboard' && styles.activeNavText]}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, currentView === 'inventory' && styles.activeNavItem]}
            onPress={() => setCurrentView('inventory')}
          >
            <Ionicons name="cube" size={24} color={currentView === 'inventory' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.navText, currentView === 'inventory' && styles.activeNavText]}>Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, currentView === 'orders' && styles.activeNavItem]}
            onPress={() => setCurrentView('orders')}
          >
            <Ionicons name="receipt" size={24} color={currentView === 'orders' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.navText, currentView === 'orders' && styles.activeNavText]}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, currentView === 'analytics' && styles.activeNavItem]}
            onPress={() => setCurrentView('analytics')}
          >
            <Ionicons name="analytics" size={24} color={currentView === 'analytics' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.navText, currentView === 'analytics' && styles.activeNavText]}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, currentView === 'customers' && styles.activeNavItem]}
            onPress={() => setCurrentView('customers')}
          >
            <Ionicons name="people" size={24} color={currentView === 'customers' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.navText, currentView === 'customers' && styles.activeNavText]}>Customers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navItem, currentView === 'chat' && styles.activeNavItem]}
            onPress={() => setCurrentView('chat')}
          >
            <Ionicons name="chatbubbles" size={24} color={currentView === 'chat' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.navText, currentView === 'chat' && styles.activeNavText]}>Support</Text>
          </TouchableOpacity>
        </View>

        <NotificationsModal />
        <ProductModalComponent
          visible={showProductModal}
          productForm={productForm}
          editingProduct={editingProduct}
          onClose={() => setShowProductModal(false)}
          onSave={(localForm: any) => handleSaveProduct(localForm)}
        />
        <ChatModal />
      </SafeAreaView>
    );
  }

  // View Components
  function CustomerHomeView() {
    return (
      <View style={styles.viewContainer}>
        <Text style={styles.viewTitle}>Welcome Home</Text>
        <Text style={styles.viewSubtitle}>Your dashboard is being prepared...</Text>
      </View>
    );
  }

  function CustomerProductsView() {
    return (
      <View style={styles.viewContainer}>
        <Text style={styles.viewTitle}>Our Products</Text>
        
        <ScrollView 
          style={styles.productsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  await syncData();
                } catch (error) {
                  console.error('Error refreshing data:', error);
                } finally {
                  setRefreshing(false);
                }
              }}
            />
          }
        >
          {products.length > 0 ? products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <Text style={styles.productIcon}>💧</Text>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>₦{product.price.toLocaleString()}</Text>
                </View>
              </View>
              <Text style={styles.productDescription}>{product.description}</Text>
              <View style={styles.productFeatures}>
                {product.features.map((feature, index) => (
                  <Text key={index} style={styles.featureTag}>• {feature}</Text>
                ))}
              </View>
              <TouchableOpacity
                style={styles.addToCartButton}
                onPress={async () => {
                  try {
                    await addToCart(product, 1);
                    
                    // Show notification
                    showNotificationBanner('Item Added to Cart', `${product.name} has been added to your cart!`);
                    
                    // Create persistent notification
                    await addNotification({
                      id: 'notif_' + Date.now(),
                      type: 'cart',
                      title: 'Item Added to Cart',
                      message: `${product.name} has been added to your cart!`,
                      userId: user?.id,
                      read: false,
                      created_at: new Date().toISOString()
                    });
                  } catch (error) {
                    console.error('Error adding to cart:', error);
                    Alert.alert('Error', 'Failed to add item to cart');
                  }
                }}
              >
                <Text style={styles.addToCartButtonText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          )) : (
            <View style={styles.emptyState}>
              <Ionicons name="water-outline" size={64} color={COLORS.gray} />
              <Text style={styles.emptyText}>No products available yet</Text>
              <Text style={styles.emptySubtext}>Check back later for new water products!</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  function CustomerCartView() {
    const updateQuantity = async (productId: string, newQuantity: number) => {
      try {
        await updateCartItem(productId, newQuantity);
      } catch (error) {
        console.error('Error updating cart item:', error);
        Alert.alert('Error', 'Failed to update cart item');
      }
    };

    const removeFromCartItem = async (productId: string) => {
      try {
        await removeFromCart(productId);
      } catch (error) {
        console.error('Error removing from cart:', error);
        Alert.alert('Error', 'Failed to remove item from cart');
      }
    };

    const getTotalPrice = () => {
      return cartTotal;
    };

    const getSubtotal = () => {
      return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    };

    const getTaxAmount = () => {
      return getSubtotal() * 0.1; // 10% tax
    };

    const getShippingCost = () => {
      return 500; // Fixed shipping cost
    };

    const getGrandTotal = () => {
      return getSubtotal() + getTaxAmount() + getShippingCost();
    };

    const proceedToCheckout = () => {
      console.log('=== CHECKOUT DEBUG ===');
      console.log('Proceed to checkout called, cart length:', cart.length);
      console.log('Cart items:', cart);
      console.log('User:', user);
      console.log('Grand total:', getGrandTotal());
      
      if (cart.length === 0) {
        console.log('Cart is empty, showing alert');
        Alert.alert('Empty Cart', 'Please add items to your cart before checkout');
        return;
      }
      
      console.log('Showing payment method selection');
      // Show payment method selection
      Alert.alert(
        'Select Payment Method',
        `Total: ₦${getGrandTotal().toLocaleString()}\n\nHow would you like to pay?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => console.log('Checkout cancelled') },
          { 
            text: 'Cash on Delivery', 
            onPress: () => {
              console.log('Cash on delivery selected');
              createOrder('cash_on_delivery');
            }
          },
          { 
            text: 'Online Payment', 
            onPress: () => {
              console.log('Online payment selected');
              createOrder('online');
            }
          }
        ]
      );
    };

    const createOrder = (paymentMethod: string) => {
      console.log('=== CREATE ORDER DEBUG ===');
      console.log('Creating order with payment method:', paymentMethod);
      console.log('Cart items:', cart);
      console.log('User:', user);
      
      const subtotal = getSubtotal();
      const taxAmount = getTaxAmount();
      const shippingCost = getShippingCost();
      const totalAmount = getGrandTotal();
      
      console.log('Calculated amounts:', { subtotal, taxAmount, shippingCost, totalAmount });
      
      const order: Order = {
        id: 'order_' + Date.now(),
        order_number: 'ORD-' + Date.now(),
        customer_id: user?.id || '',
        subtotal: subtotal,
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        total_amount: totalAmount,
        payment_method: paymentMethod === 'cash_on_delivery' ? 'cash' : 'card',
        payment_status: 'pending',
        status: 'pending',
        shipping_address: user?.profile?.address || '',
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        order_items: cart.map(item => ({
          id: 'item_' + Date.now() + '_' + Math.random(),
          order_id: 'order_' + Date.now(),
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          created_at: new Date().toISOString()
        }))
      };
      
      console.log('Order created:', order);
      
      try {
        setOrders(prev => {
          console.log('Previous orders:', prev);
          const newOrders = [...prev, order];
          console.log('New orders array:', newOrders);
          return newOrders;
        });
        
        console.log('Cart before clearing:', cart);
        setCart([]);
        console.log('Cart cleared');
        
        const paymentMessage = paymentMethod === 'cash_on_delivery' 
          ? 'Order placed successfully! You will pay cash on delivery.'
          : 'Order placed successfully! Please complete your online payment.';
        
        console.log('Payment message:', paymentMessage);
        
        // Show notification
        showNotificationBanner('Order Placed', paymentMessage);
        
        // Create persistent notification
        createNotification('payment', 'Order Placed', paymentMessage);
        
        Alert.alert('Success', paymentMessage);
        console.log('Order creation completed successfully');
      } catch (error) {
        console.error('Error in createOrder:', error);
        Alert.alert('Error', 'Failed to create order. Please try again.');
      }
    };

    return (
      <View style={styles.viewContainer}>
        <Text style={styles.viewTitle}>Shopping Cart</Text>
        
        {cart.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => setCustomerView('products')}
            >
              <Text style={styles.browseButtonText}>Browse Products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView style={styles.cartList}>
              {cart.map((item) => (
                <View key={item.product.id} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                    <Text style={styles.cartItemPrice}>₦{item.product.price.toLocaleString()}</Text>
                    <Text style={styles.cartItemDescription}>{item.product.description}</Text>
                  </View>
                  
                  <View style={styles.cartItemControls}>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromCartItem(item.product.id)}
                    >
                      <Ionicons name="trash" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.cartItemTotal}>
                    ₦{(item.product.price * item.quantity).toLocaleString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.cartFooter}>
              <View style={styles.cartTotal}>
                <Text style={styles.cartTotalLabel}>Subtotal:</Text>
                <Text style={styles.cartTotalAmount}>₦{getSubtotal().toLocaleString()}</Text>
              </View>
              <View style={styles.cartTotal}>
                <Text style={styles.cartTotalLabel}>Tax (10%):</Text>
                <Text style={styles.cartTotalAmount}>₦{getTaxAmount().toLocaleString()}</Text>
              </View>
              <View style={styles.cartTotal}>
                <Text style={styles.cartTotalLabel}>Shipping:</Text>
                <Text style={styles.cartTotalAmount}>₦{getShippingCost().toLocaleString()}</Text>
              </View>
              <View style={[styles.cartTotal, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 }]}>
                <Text style={[styles.cartTotalLabel, { fontWeight: 'bold' as const }]}>Total:</Text>
                <Text style={[styles.cartTotalAmount, { fontWeight: 'bold' as const }]}>₦{getGrandTotal().toLocaleString()}</Text>
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
    );
  }

  function CustomerOrdersView() {
    const customerOrders = orders.filter(order => order.customer_id === user?.id);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    
    const filteredOrders = selectedStatus === 'all' 
      ? customerOrders 
      : customerOrders.filter(order => order.status === selectedStatus);

    const reorderItems = (order: any) => {
      const itemsToAdd = order.items.map((item: any) => ({
        product: item.product,
        quantity: item.quantity
      }));
      
      setCart(prev => {
        const newCart = [...prev];
        itemsToAdd.forEach((newItem: any) => {
          const existingItem = newCart.find(item => item.product.id === newItem.product.id);
          if (existingItem) {
            existingItem.quantity += newItem.quantity;
          } else {
            newCart.push(newItem);
          }
        });
        return newCart;
      });
      
      setCustomerView('cart');
      Alert.alert('Success', 'Items added to cart!');
    };

    return (
      <View style={styles.viewContainer}>
        <Text style={styles.viewTitle}>Your Orders</Text>
        
        {/* Status Filter */}
        <View style={styles.filterContainer}>
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                selectedStatus === status && styles.filterButtonActive
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedStatus === status && styles.filterButtonTextActive
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Orders List */}
        <ScrollView style={styles.ordersList}>
          {filteredOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>Order #{order.id.slice(-6)}</Text>
                <View style={[styles.orderStatus, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.orderStatusText}>{order.status.toUpperCase()}</Text>
                </View>
              </View>
              
              <View style={styles.orderDetails}>
                <Text style={styles.orderAmount}>Amount: ₦{order.total_amount.toLocaleString()}</Text>
                <Text style={styles.orderPayment}>
                  Payment: {order.payment_method === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online Payment'}
                </Text>
                <Text style={styles.orderPaymentStatus}>
                  Payment Status: {order.payment_status === 'pending' ? 'Pending' : 'Paid'}
                </Text>
                <Text style={styles.orderDate}>
                  Date: {new Date(order.created_at).toLocaleDateString()}
                </Text>
              </View>

              {/* Order Items */}
              <View style={styles.orderItems}>
                <Text style={styles.orderItemsTitle}>Items:</Text>
                {order.items.map((item, index) => (
                  <Text key={index} style={styles.orderItem}>
                    {item.quantity}x {item.product.name} - ₦{item.price.toLocaleString()}
                  </Text>
                ))}
              </View>

              {/* Order Actions */}
              <View style={styles.orderActions}>
                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() => {
                    Alert.alert(
                      'Order Details',
                      `Order #${order.id.slice(-6)}\n` +
                      `Status: ${order.status.toUpperCase()}\n` +
                      `Total: ₦${order.total_amount.toLocaleString()}\n` +
                      `Date: ${new Date(order.created_at).toLocaleDateString()}\n\n` +
                      `Items:\n${order.items.map((item: any) => 
                        `${item.quantity}x ${item.product.name} - ₦${item.price.toLocaleString()}`
                      ).join('\n')}`
                    );
                  }}
                >
                  <Text style={styles.detailsButtonText}>View Details</Text>
                </TouchableOpacity>
                
                {(order.status === 'delivered' || order.status === 'cancelled') && (
                  <TouchableOpacity
                    style={styles.reorderButton}
                    onPress={() => reorderItems(order)}
                  >
                    <Text style={styles.reorderButtonText}>Reorder</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          
          {filteredOrders.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.gray} />
              <Text style={styles.emptyText}>
                {selectedStatus === 'all' ? 'No orders yet' : `No ${selectedStatus} orders`}
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => setCustomerView('products')}
              >
                <Text style={styles.browseButtonText}>Browse Products</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  function CustomerProfileView() {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
      first_name: user?.profile?.first_name || '',
      last_name: user?.profile?.last_name || '',
      phone: user?.profile?.phone || '',
      address: user?.profile?.address || '',
    });

    const handleSaveProfile = async () => {
      if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
        Alert.alert('Validation Error', 'First name and last name are required');
        return;
      }

      try {
        const updatedUser = {
          ...user,
          profile: {
            ...user?.profile,
            first_name: editForm.first_name.trim(),
            last_name: editForm.last_name.trim(),
            phone: editForm.phone.trim(),
            address: editForm.address.trim(),
          }
        };
        
        setUser(updatedUser);
        await storage.setItem('@zada_user', JSON.stringify(updatedUser));
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } catch (error) {
        Alert.alert('Error', 'Failed to update profile');
      }
    };

    const customerOrders = orders.filter(order => order.customer_id === user?.id);
    const totalSpent = customerOrders.reduce((sum, order) => sum + order.total_amount, 0);

    return (
      <View style={styles.viewContainer}>
        <Text style={styles.viewTitle}>Profile</Text>
        
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.profile?.first_name?.charAt(0) || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.profile?.first_name || 'Unknown'} {user?.profile?.last_name || ''}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileRole}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Profile Stats */}
        <View style={styles.profileStats}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{customerOrders.length}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>₦{totalSpent.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{cart.length}</Text>
            <Text style={styles.statLabel}>Cart Items</Text>
          </View>
        </View>

        {/* Profile Form */}
        <View style={styles.profileForm}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Personal Information</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Text style={styles.editButtonText}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formFields}>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <StableInput
                style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
                value={editForm.first_name}
                onChangeText={handleEditFirstNameChange}
                placeholder="Enter first name"
                selectTextOnFocus={false}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              <StableInput
                style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
                value={editForm.last_name}
                onChangeText={handleEditLastNameChange}
                placeholder="Enter last name"
                selectTextOnFocus={false}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <StableInput
                style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
                value={editForm.phone}
                onChangeText={handleEditPhoneChange}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                selectTextOnFocus={false}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Address</Text>
              <StableInput
                style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
                value={editForm.address}
                onChangeText={handleEditAddressChange}
                placeholder="Enter address"
                multiline
                selectTextOnFocus={false}
                blurOnSubmit={false}
                numberOfLines={3}
              />
            </View>
          </View>

          {isEditing && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Account Actions */}
        <View style={styles.accountActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Alert.alert(
                'Change Password',
                'Password change functionality will be available soon.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Ionicons name="lock-closed" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.error + '20' }]}
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'Are you sure you want to delete your account? This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert('Account Deletion', 'Account deletion will be available soon.');
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="trash" size={20} color={COLORS.error} />
            <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function ChatView() {
    const [recentMessages, setRecentMessages] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Load recent messages for customer
    useEffect(() => {
      if (user?.role === 'customer') {
        loadRecentMessages();
      }
    }, [user]);

    const loadRecentMessages = async () => {
      try {
        const messagesData = await storage.getItem('@zada_chat_messages');
        if (messagesData) {
          const allMessages = JSON.parse(messagesData);
          const supportMessages = allMessages.filter((msg: any) => 
            msg.type === 'support' && 
            (msg.sender_id === user?.id || msg.recipient_id === user?.id)
          );
          
          // Get unique conversations
          const conversations = supportMessages.reduce((acc: any, msg: any) => {
            const otherUserId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
            if (!acc[otherUserId]) {
              acc[otherUserId] = {
                lastMessage: msg,
                unreadCount: 0
              };
            }
            if (msg.sender_id !== user?.id && msg.status === 'unread') {
              acc[otherUserId].unreadCount++;
            }
            if (new Date(msg.created_at) > new Date(acc[otherUserId].lastMessage.created_at)) {
              acc[otherUserId].lastMessage = msg;
            }
            return acc;
          }, {});

          setRecentMessages(Object.values(conversations));
          setUnreadCount(Object.values(conversations).reduce((sum: number, conv: any) => sum + conv.unreadCount, 0));
        }
      } catch (error) {
        console.error('Error loading recent messages:', error);
      }
    };

    return (
      <View style={styles.viewContainer}>
        <View style={styles.chatHeader}>
          <Text style={styles.viewTitle}>
            {user?.role === 'admin' ? 'Customer Support' : 'Support Chat'}
          </Text>
          {user?.role === 'customer' && unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => openChat()}
          >
            <Ionicons name="chatbubbles" size={20} color={COLORS.white} />
            <Text style={styles.chatButtonText}>
              {user?.role === 'admin' ? 'View All Messages' : 'Start Chat'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {user?.role === 'admin' ? (
          <ScrollView style={styles.customersList}>
            {customers.map((customer) => (
              <TouchableOpacity
                key={customer.id}
                style={styles.customerItem}
                onPress={() => openChat(customer)}
              >
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>
                    {customer.profile?.first_name || 'Customer'} {customer.profile?.last_name || ''}
                  </Text>
                  <Text style={styles.customerEmail}>{customer.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <ScrollView style={styles.recentChats} keyboardShouldPersistTaps="handled">
            {recentMessages.length > 0 ? (
              recentMessages.map((conversation: any, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.conversationItem}
                  onPress={() => {
                    // Find the customer for this conversation
                    const otherUserId = conversation.lastMessage.sender_id === user?.id 
                      ? conversation.lastMessage.recipient_id 
                      : conversation.lastMessage.sender_id;
                    const customer = customers.find(c => c.id === otherUserId);
                    if (customer) {
                      openChat(customer);
                    }
                  }}
                >
                  <View style={styles.conversationInfo}>
                    <Text style={styles.conversationTitle}>Support Chat</Text>
                    <Text style={styles.conversationPreview}>
                      {conversation.lastMessage.content}
                    </Text>
                    <Text style={styles.conversationTime}>
                      {new Date(conversation.lastMessage.created_at).toLocaleString()}
                    </Text>
                  </View>
                  {conversation.unreadCount > 0 && (
                    <View style={styles.conversationUnread}>
                      <Text style={styles.conversationUnreadCount}>{conversation.unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.chatInfo}>
                <Text style={styles.chatInfoText}>
                  Need help? Start a conversation with our support team.
                </Text>
                <TouchableOpacity
                  style={styles.startChatButton}
                  onPress={() => openChat()}
                >
                  <Ionicons name="chatbubble" size={24} color={COLORS.white} />
                  <Text style={styles.startChatButtonText}>Start Chat</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  function AdminDashboardView() {
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const activeCustomers = customers.length;
    const lowStockProducts = products.filter(product => product.stock_quantity <= product.min_stock_level).length;

    return (
      <View style={styles.viewContainer}>
        <Text style={styles.viewTitle}>Admin Dashboard</Text>
        
        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="people" size={24} color={COLORS.primary} />
              <Text style={styles.metricLabel}>Active Customers</Text>
            </View>
            <Text style={styles.metricValue}>{activeCustomers}</Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="receipt" size={24} color={COLORS.success} />
              <Text style={styles.metricLabel}>Total Orders</Text>
            </View>
            <Text style={styles.metricValue}>{totalOrders}</Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="time" size={24} color={COLORS.warning} />
              <Text style={styles.metricLabel}>Pending Orders</Text>
            </View>
            <Text style={styles.metricValue}>{pendingOrders}</Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="cash" size={24} color={COLORS.success} />
              <Text style={styles.metricLabel}>Total Revenue</Text>
            </View>
            <Text style={styles.metricValue}>₦{totalRevenue.toLocaleString()}</Text>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <ScrollView style={styles.ordersList} showsVerticalScrollIndicator={false}>
            {orders.slice(0, 5).map((order) => (
              <View key={order.id} style={styles.orderItem}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>Order #{order.id.slice(-6)}</Text>
                  <Text style={styles.orderCustomer}>{order.customer_name}</Text>
                  <Text style={styles.orderAmount}>₦{order.total_amount.toLocaleString()}</Text>
                </View>
                <View style={[styles.orderStatus, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.orderStatusText}>{order.status.toUpperCase()}</Text>
                </View>
              </View>
            ))}
            {orders.length === 0 && (
              <Text style={styles.emptyText}>No orders yet</Text>
            )}
          </ScrollView>
        </View>

        {/* Low Stock Alert */}
        {lowStockProducts > 0 && (
          <View style={styles.alertCard}>
            <Ionicons name="warning" size={20} color={COLORS.warning} />
            <Text style={styles.alertText}>
              {lowStockProducts} product{lowStockProducts > 1 ? 's' : ''} running low on stock
            </Text>
          </View>
        )}
      </View>
    );
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'processing': return COLORS.primary;
      case 'shipped': return COLORS.success;
      case 'delivered': return COLORS.success;
      case 'cancelled': return COLORS.error;
      default: return COLORS.gray;
    }
  }

  function AdminInventoryView() {
    return (
      <View style={styles.viewContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.viewTitle}>Inventory Management</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.productsList} keyboardShouldPersistTaps="handled">
          {(products || []).map((product) => (
            <View key={product.id} style={styles.productItem}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productDescription}>{product.description}</Text>
                <Text style={styles.productPrice}>₦{product.price.toLocaleString()}</Text>
                <Text style={styles.productStock}>
                  Stock: {product.stock_quantity} (Min: {product.min_stock_level})
                </Text>
              </View>
              <View style={styles.productActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditProduct(product)}
                >
                  <Ionicons name="create" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteProduct(product.id)}
                >
                  <Ionicons name="trash" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  function AdminOrdersView() {
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    
    const filteredOrders = selectedStatus === 'all' 
      ? orders 
      : orders.filter(order => order.status === selectedStatus);

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
      try {
        const updatedOrders = orders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        );
        setOrders(updatedOrders);
        await storage.setItem('@zada_orders', JSON.stringify(updatedOrders));
        
        // Create notification for customer
        const order = orders.find(o => o.id === orderId);
        if (order) {
          await createNotification('order_update', 'Order Status Updated', 
            `Your order #${orderId.slice(-6)} status has been updated to ${newStatus}`);
        }
        
        Alert.alert('Success', 'Order status updated successfully!');
      } catch (error) {
        Alert.alert('Error', 'Failed to update order status');
      }
    };

    const updateDeliveryStatus = async (orderId: string, deliveryStatus: string) => {
      try {
        const updatedOrders = orders.map(order => 
          order.id === orderId 
            ? { ...order, delivery_status: deliveryStatus, updated_at: new Date().toISOString() }
            : order
        );
        setOrders(updatedOrders);
        await storage.setItem('@zada_orders', JSON.stringify(updatedOrders));
        
        // Create notification for customer
        const order = orders.find(o => o.id === orderId);
        if (order) {
          await createNotification('delivery_update', 'Delivery Status Updated', 
            `Your order #${orderId.slice(-6)} delivery status: ${deliveryStatus}`);
        }
        
        Alert.alert('Success', 'Delivery status updated successfully!');
      } catch (error) {
        Alert.alert('Error', 'Failed to update delivery status');
      }
    };

    const updatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
      try {
        const updatedOrders = orders.map(order => 
          order.id === orderId 
            ? { ...order, payment_status: newPaymentStatus, updated_at: new Date().toISOString() }
            : order
        );
        setOrders(updatedOrders);
        await storage.setItem('@zada_orders', JSON.stringify(updatedOrders));
        Alert.alert('Success', 'Payment status updated successfully!');
      } catch (error) {
        Alert.alert('Error', 'Failed to update payment status');
      }
    };

    return (
      <View style={styles.viewContainer}>
        <Text style={styles.viewTitle}>Order Management</Text>
        
        {/* Status Filter */}
        <View style={styles.filterContainer}>
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                selectedStatus === status && styles.filterButtonActive
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedStatus === status && styles.filterButtonTextActive
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Orders List */}
        <ScrollView style={styles.ordersList}>
          {filteredOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>Order #{order.id.slice(-6)}</Text>
                <View style={[styles.orderStatus, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.orderStatusText}>{order.status.toUpperCase()}</Text>
                </View>
              </View>
              
              <View style={styles.orderDetails}>
                <Text style={styles.orderCustomer}>Customer: {order.customer_name}</Text>
                <Text style={styles.orderEmail}>Email: {order.customer_email}</Text>
                <Text style={styles.orderAmount}>Amount: ₦{order.total_amount.toLocaleString()}</Text>
                <Text style={styles.orderPayment}>
                  Payment: {order.payment_method === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online Payment'}
                </Text>
                <Text style={styles.orderPaymentStatus}>
                  Payment Status: {order.payment_status === 'pending' ? 'Pending' : 'Paid'}
                </Text>
                <Text style={styles.orderDate}>
                  Date: {new Date(order.created_at).toLocaleDateString()}
                </Text>
              </View>

              {/* Order Items */}
              <View style={styles.orderItems}>
                <Text style={styles.orderItemsTitle}>Items:</Text>
                {order.items.map((item, index) => (
                  <Text key={index} style={styles.orderItem}>
                    {item.quantity}x {item.product.name} - ₦{item.price.toLocaleString()}
                  </Text>
                ))}
              </View>

              {/* Status Update Buttons */}
              <View style={styles.statusButtons}>
                {order.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: COLORS.primary }]}
                    onPress={() => updateOrderStatus(order.id, 'processing')}
                  >
                    <Text style={styles.statusButtonText}>Start Processing</Text>
                  </TouchableOpacity>
                )}
                {order.status === 'processing' && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: COLORS.success }]}
                    onPress={() => updateOrderStatus(order.id, 'shipped')}
                  >
                    <Text style={styles.statusButtonText}>Mark as Shipped</Text>
                  </TouchableOpacity>
                )}
                {order.status === 'shipped' && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: COLORS.success }]}
                    onPress={() => updateOrderStatus(order.id, 'delivered')}
                  >
                    <Text style={styles.statusButtonText}>Mark as Delivered</Text>
                  </TouchableOpacity>
                )}
                {(order.status === 'pending' || order.status === 'processing') && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: COLORS.error }]}
                    onPress={() => updateOrderStatus(order.id, 'cancelled')}
                  >
                    <Text style={styles.statusButtonText}>Cancel Order</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Payment Status Buttons */}
              {order.payment_method === 'cash_on_delivery' && order.payment_status === 'pending' && (
                <View style={styles.paymentButtons}>
                  <TouchableOpacity
                    style={[styles.paymentButton, { backgroundColor: COLORS.success }]}
                    onPress={() => updatePaymentStatus(order.id, 'paid')}
                  >
                    <Text style={styles.paymentButtonText}>Mark as Paid</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Delivery Status */}
              <View style={styles.deliveryStatus}>
                <Ionicons name="car" size={16} color={COLORS.primary} />
                <Text style={styles.deliveryStatusText}>
                  Delivery: {order.delivery_status || 'Not Started'}
                </Text>
              </View>

              {/* Delivery Status Buttons */}
              <View style={styles.deliveryStatusButtons}>
                <TouchableOpacity
                  style={[styles.deliveryStatusButton, { backgroundColor: COLORS.primary }]}
                  onPress={() => updateDeliveryStatus(order.id, 'Preparing')}
                >
                  <Text style={styles.deliveryStatusButtonText}>Preparing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deliveryStatusButton, { backgroundColor: COLORS.warning }]}
                  onPress={() => updateDeliveryStatus(order.id, 'Out for Delivery')}
                >
                  <Text style={styles.deliveryStatusButtonText}>Out for Delivery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deliveryStatusButton, { backgroundColor: COLORS.success }]}
                  onPress={() => updateDeliveryStatus(order.id, 'Delivered')}
                >
                  <Text style={styles.deliveryStatusButtonText}>Delivered</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          
          {filteredOrders.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.gray} />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  function AdminAnalyticsView() {
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Calculate revenue by status
    const revenueByStatus = {
      pending: orders.filter(o => o.status === 'pending').reduce((sum, o) => sum + o.total_amount, 0),
      processing: orders.filter(o => o.status === 'processing').reduce((sum, o) => sum + o.total_amount, 0),
      shipped: orders.filter(o => o.status === 'shipped').reduce((sum, o) => sum + o.total_amount, 0),
      delivered: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total_amount, 0),
      cancelled: orders.filter(o => o.status === 'cancelled').reduce((sum, o) => sum + o.total_amount, 0),
    };

    // Calculate orders by status
    const ordersByStatus = {
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
    };

    // Payment method analytics
    const paymentMethodStats = {
      cash_on_delivery: orders.filter(o => o.payment_method === 'cash_on_delivery').length,
      online: orders.filter(o => o.payment_method === 'online').length,
    };

    const paymentRevenue = {
      cash_on_delivery: orders.filter(o => o.payment_method === 'cash_on_delivery').reduce((sum, o) => sum + o.total_amount, 0),
      online: orders.filter(o => o.payment_method === 'online').reduce((sum, o) => sum + o.total_amount, 0),
    };

    // Top selling products
    const productSales = products.map(product => {
      const productOrders = orders.flatMap(order => 
        order.items.filter(item => item.product.id === product.id)
      );
      const totalQuantity = productOrders.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = productOrders.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      return {
        ...product,
        totalQuantity,
        totalRevenue
      };
    }).sort((a, b) => b.totalQuantity - a.totalQuantity);

    return (
      <View style={styles.viewContainer}>
        <Text style={styles.viewTitle}>Analytics Dashboard</Text>
        
        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <Text style={styles.metricValue}>₦{totalRevenue.toLocaleString()}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Orders</Text>
            <Text style={styles.metricValue}>{totalOrders}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Avg Order Value</Text>
            <Text style={styles.metricValue}>₦{averageOrderValue.toLocaleString()}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Active Products</Text>
            <Text style={styles.metricValue}>{products.length}</Text>
          </View>
        </View>

        {/* Revenue by Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue by Order Status</Text>
          <View style={styles.chartContainer}>
            {Object.entries(revenueByStatus).map(([status, revenue]) => (
              <View key={status} style={styles.chartItem}>
                <View style={styles.chartLabel}>
                  <View style={[styles.chartColor, { backgroundColor: getStatusColor(status) }]} />
                  <Text style={styles.chartText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                </View>
                <Text style={styles.chartValue}>₦{revenue.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Orders by Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Orders by Status</Text>
          <View style={styles.chartContainer}>
            {Object.entries(ordersByStatus).map(([status, count]) => (
              <View key={status} style={styles.chartItem}>
                <View style={styles.chartLabel}>
                  <View style={[styles.chartColor, { backgroundColor: getStatusColor(status) }]} />
                  <Text style={styles.chartText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                </View>
                <Text style={styles.chartValue}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Method Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartItem}>
              <View style={styles.chartLabel}>
                <View style={[styles.chartColor, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.chartText}>Cash on Delivery</Text>
              </View>
              <Text style={styles.chartValue}>{paymentMethodStats.cash_on_delivery}</Text>
            </View>
            <View style={styles.chartItem}>
              <View style={styles.chartLabel}>
                <View style={[styles.chartColor, { backgroundColor: COLORS.success }]} />
                <Text style={styles.chartText}>Online Payment</Text>
              </View>
              <Text style={styles.chartValue}>{paymentMethodStats.online}</Text>
            </View>
          </View>
        </View>

        {/* Payment Revenue */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue by Payment Method</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartItem}>
              <View style={styles.chartLabel}>
                <View style={[styles.chartColor, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.chartText}>Cash on Delivery</Text>
              </View>
              <Text style={styles.chartValue}>₦{paymentRevenue.cash_on_delivery.toLocaleString()}</Text>
            </View>
            <View style={styles.chartItem}>
              <View style={styles.chartLabel}>
                <View style={[styles.chartColor, { backgroundColor: COLORS.success }]} />
                <Text style={styles.chartText}>Online Payment</Text>
              </View>
              <Text style={styles.chartValue}>₦{paymentRevenue.online.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Top Selling Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Selling Products</Text>
          <ScrollView style={styles.productsList} showsVerticalScrollIndicator={false}>
            {productSales.slice(0, 5).map((product, index) => (
              <View key={product.id} style={styles.productRankItem}>
                <View style={styles.rankNumber}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.productRankInfo}>
                  <Text style={styles.productRankName}>{product.name}</Text>
                  <Text style={styles.productRankStats}>
                    {product.totalQuantity} sold • ₦{product.totalRevenue.toLocaleString()} revenue
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  function AdminCustomersView() {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCustomers = customers.filter(customer => 
      customer.profile?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.profile?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCustomerOrderStats = (customerId: string) => {
      const customerOrders = orders.filter(order => order.customer_id === customerId);
      const totalOrders = customerOrders.length;
      const totalSpent = customerOrders.reduce((sum, order) => sum + order.total_amount, 0);
      const lastOrder = customerOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      return {
        totalOrders,
        totalSpent,
        lastOrder: lastOrder ? new Date(lastOrder.created_at).toLocaleDateString() : 'No orders'
      };
    };

    return (
      <View style={styles.viewContainer}>
        <Text style={styles.viewTitle}>Customer Management</Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray} />
          <StableInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search customers..."
            placeholderTextColor={COLORS.gray}
            selectTextOnFocus={false}
            blurOnSubmit={false}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {/* Customers List */}
        <ScrollView style={styles.customersList}>
          {filteredCustomers.map((customer) => {
            const stats = getCustomerOrderStats(customer.id);
            return (
              <View key={customer.id} style={styles.customerCard}>
                <View style={styles.customerHeader}>
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerAvatarText}>
                      {customer.profile?.first_name?.charAt(0) || 'C'}
                    </Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>
                      {customer.profile?.first_name || 'Unknown'} {customer.profile?.last_name || ''}
                    </Text>
                    <Text style={styles.customerEmail}>{customer.email}</Text>
                    <Text style={styles.customerPhone}>
                      {customer.profile?.phone || 'No phone'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => openChat(customer)}
                  >
                    <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.customerStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Orders</Text>
                    <Text style={styles.statValue}>{stats.totalOrders}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Spent</Text>
                    <Text style={styles.statValue}>₦{stats.totalSpent.toLocaleString()}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Last Order</Text>
                    <Text style={styles.statValue}>{stats.lastOrder}</Text>
                  </View>
                </View>

                {customer.profile?.address && (
                  <View style={styles.customerAddress}>
                    <Ionicons name="location" size={16} color={COLORS.gray} />
                    <Text style={styles.addressText}>{customer.profile.address}</Text>
                  </View>
                )}
              </View>
            );
          })}
          
          {filteredCustomers.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={COLORS.gray} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No customers found' : 'No customers yet'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  function NotificationsModal() {
    return (
        <Modal
          visible={showNotifications}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            markAllNotificationsAsRead();
            setShowNotifications(false);
          }}
        >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                markAllNotificationsAsRead();
                setShowNotifications(false);
              }}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={styles.notificationItem}
                onPress={() => {
                  markNotificationAsRead(notification.id);
                  setShowNotifications(false);
                }}
              >
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationText}>{notification.content}</Text>
                  <Text style={styles.notificationTime}>
                    {new Date(notification.created_at).toLocaleString()}
                  </Text>
                </View>
                {notification.status === 'unread' && (
                  <View style={styles.unreadIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textPrimary,
  },
  authGradient: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
  },
  authScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: SPACING['2xl'],
  },
  authTitle: {
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    fontWeight: 'bold' as const,
    color: COLORS.white,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  authForm: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  inputGroup: {
    flex: 1,
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '500' as const,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    backgroundColor: COLORS.white,
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    paddingRight: 50, // Space for toggle button
    fontSize: TYPOGRAPHY.fontSize.base,
    backgroundColor: COLORS.white,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  roleSelector: {
    marginBottom: SPACING.lg,
  },
  roleLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '500' as const,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  roleButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
  },
  roleButtonTextActive: {
    color: COLORS.white,
    fontWeight: '500' as const,
  },
  adminEmailHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '500' as const,
  },
  toggleButton: {
    alignItems: 'center',
  },
  toggleButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: 'bold' as const,
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.white,
    opacity: 0.9,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  notificationButton: {
    position: 'relative',
    padding: SPACING.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: 'bold' as const,
  },
  logoutButton: {
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
  },
  viewContainer: {
    flex: 1,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: 'bold' as const,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  viewSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  activeNavItem: {
    backgroundColor: COLORS.primary + '20',
  },
  navText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  activeNavText: {
    color: COLORS.primary,
    fontWeight: '500' as const,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: 'bold' as const,
    color: COLORS.textPrimary,
  },
  modalCloseButton: {
    padding: SPACING.sm,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600' as const,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: '600' as const,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '500' as const,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  notificationText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  notificationTime: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.sm,
    marginTop: SPACING.sm,
  },
  // Product Management Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  productsList: {
    flex: 1,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.primary,
    marginBottom: 4,
  },
  productStock: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: COLORS.background,
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  // Product Card Styles
  productCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  productFeatures: {
    marginVertical: 12,
  },
  featureTag: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  addToCartButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  addToCartButtonText: {
    color: COLORS.white,
    fontWeight: '600' as const,
    fontSize: 16,
  },
  // Chat Styles
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chatButtonText: {
    color: COLORS.white,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  customersList: {
    flex: 1,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  chatInfoText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startChatButtonText: {
    color: COLORS.white,
    fontWeight: '600' as const,
    fontSize: 16,
    marginLeft: 8,
  },
  // Chat Modal Styles
  chatMessages: {
    flex: 1,
    padding: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chatInput: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dashboard Styles
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  metricCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    width: '48%',
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: 'bold' as const,
    color: COLORS.textPrimary,
  },
  ordersList: {
    maxHeight: 300,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  orderCustomer: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderAmount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
    color: COLORS.success,
    marginTop: 2,
  },
  orderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    padding: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.md,
  },
  alertText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.warning,
    marginLeft: SPACING.sm,
  },
  // Order Management Styles
  filterContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.gray + '20',
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  orderDetails: {
    marginBottom: SPACING.md,
  },
  orderEmail: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderItems: {
    marginBottom: SPACING.md,
  },
  orderItemsTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
  },
  // Analytics Styles
  chartContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  chartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chartLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  chartText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textPrimary,
  },
  chartValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  productRankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rankNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  rankText: {
    color: COLORS.white,
    fontWeight: 'bold' as const,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  productRankInfo: {
    flex: 1,
  },
  productRankName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  productRankStats: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Customer Management Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textPrimary,
  },
  customersList: {
    flex: 1,
  },
  customerCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  customerAvatarText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: 'bold' as const,
  },
  customerInfo: {
    flex: 1,
  },
  customerPhone: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  customerAddress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  // Cart Styles
  cartList: {
    flex: 1,
  },
  cartItem: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartItemInfo: {
    marginBottom: SPACING.md,
  },
  cartItemName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  cartItemPrice: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.success,
    marginTop: 2,
  },
  cartItemDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  cartItemControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
    marginHorizontal: SPACING.md,
  },
  removeButton: {
    padding: SPACING.sm,
  },
  cartItemTotal: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: 'bold' as const,
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginTop: SPACING.sm,
  },
  cartFooter: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  cartTotalLabel: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  cartTotalAmount: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: 'bold' as const,
    color: COLORS.primary,
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: 'bold' as const,
  },
  // Order Actions
  orderActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: COLORS.gray + '20',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
  },
  reorderButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  reorderButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
  },
  // Profile Styles
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  profileAvatarText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: 'bold' as const,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: 'bold' as const,
    color: COLORS.textPrimary,
  },
  profileEmail: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileRole: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.primary,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: 'bold' as const,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  profileForm: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  formTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  editButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
  },
  formFields: {
    marginBottom: SPACING.lg,
  },
  formField: {
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textPrimary,
  },
  fieldInputDisabled: {
    backgroundColor: COLORS.gray + '20',
    color: COLORS.textSecondary,
  },
  accountActions: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  actionButtonText: {
    marginLeft: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING['4xl'],
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.lg,
  },
  browseButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
  },
  // Payment Styles
  orderPayment: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderPaymentStatus: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  paymentButtons: {
    flexDirection: 'row',
    marginTop: SPACING.md,
  },
  paymentButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: SPACING.sm,
  },
  paymentButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as const,
  },
  // Notification styles
  notificationBanner: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  notificationBannerText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    flex: 1,
    marginHorizontal: SPACING.sm,
  },
  // Chat conversation styles
  recentChats: {
    flex: 1,
    padding: SPACING.md,
  },
  conversationItem: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  conversationPreview: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  conversationTime: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.gray,
  },
  conversationUnread: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationUnreadCount: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '600' as const,
  },
  // Delivery status styles
  deliveryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  deliveryStatusText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  deliveryStatusButtons: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
  },
  deliveryStatusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  deliveryStatusButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '600' as const,
  },
});