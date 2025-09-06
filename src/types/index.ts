/**
 * Type definitions for the ZADA Water Delivery App
 * Centralized type definitions for better maintainability and reusability
 */

// User and Authentication Types
export interface AppUser {
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

export interface CustomerProfile {
  id?: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

// Product Types
export interface Product {
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

export interface OrderItem {
  product: Product;
  quantity: number;
}

// Order Types
export interface CustomerOrder {
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

export interface AdminOrder {
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

// Message Types
export interface ChatMessage {
  id: string;
  orderId?: string;
  type: 'support' | 'order';
  senderRole: 'customer' | 'admin';
  senderId: string;
  content: string;
  createdAt: Date;
}

// Analytics Types
export interface Analytics {
  monthlyRevenue: number;
  customerGrowth: number;
  fulfillmentRate: number;
  inventoryTurnover: number;
  totalOrders: number;
  pendingOrders: number;
  lowStockItems: number;
  averageOrderValue: number;
}

// UI State Types
export type CustomerView = 'home' | 'products' | 'cart' | 'orders' | 'profile';
export type AdminView = 'dashboard' | 'inventory' | 'orders' | 'delivery' | 'analytics' | 'notifications' | 'supportInbox';
export type PaymentMethod = 'cash' | 'card' | 'transfer';

// Cart Types
export interface CartItem {
  product: Product;
  quantity: number;
  addedAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'admin';
  phone?: string;
  address?: string;
}

// Filter Types
export interface ProductFilters {
  category: string;
  searchTerm: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

// Delivery Types
export interface DeliveryZone {
  id: string;
  name: string;
  capacity: number;
  currentLoad: number;
  estimatedTime: string;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Constants
export const ORDER_STATUSES = [
  'pending',
  'confirmed', 
  'out_for_delivery',
  'delivered',
  'cancelled'
] as const;

export const ORDER_PRIORITIES = [
  'low',
  'medium', 
  'high'
] as const;

export const PRODUCT_CATEGORIES = [
  'water',
  'dispenser',
  'accessories'
] as const;

export const PAYMENT_METHODS = [
  'cash',
  'card',
  'transfer'
] as const;
