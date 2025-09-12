/**
 * Simplified Authentication Service
 * Web-compatible authentication without external dependencies
 */

import { storage } from '../../storageUtils';

export interface AuthUser {
  id: string;
  email: string;
  role: 'customer' | 'admin' | 'super_admin';
  profile: {
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
    avatar_url?: string;
  };
  preferences: {
    notifications: boolean;
    marketing: boolean;
    theme: 'light' | 'dark';
  };
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_login_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'admin';
  terms_accepted: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  refresh_token: string;
  expires_in: number;
}

class AuthService {
  private static instance: AuthService;
  
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
  
  // Simple password validation (for demo purposes)
  private validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Validate admin email domain
  private validateAdminEmail(email: string): boolean {
    const allowedDomains = ['@zadafoods.com', '@zada.com'];
    const allowedEmails = [
      'admin@zada.com',
      'manager@zada.com',
      'supervisor@zada.com',
      'ceo@zadafoods.com',
      'cto@zadafoods.com'
    ];
    
    const normalizedEmail = email.toLowerCase();
    const isAllowedDomain = allowedDomains.some(domain => 
      normalizedEmail.endsWith(domain)
    );
    const isAllowedEmail = allowedEmails.includes(normalizedEmail);
    
    return isAllowedDomain || isAllowedEmail;
  }
  
  // Validate email format
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Validate input
      if (!this.isValidEmail(data.email)) {
        throw new Error('Invalid email format');
      }
      
      const passwordValidation = this.validatePasswordStrength(data.password);
      if (!passwordValidation.valid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }
      
      if (!data.terms_accepted) {
        throw new Error('Terms and conditions must be accepted');
      }
      
      // Validate admin email for admin role
      if (data.role === 'admin' && !this.validateAdminEmail(data.email)) {
        throw new Error('Admin accounts require @zadafoods.com or @zada.com email addresses');
      }
      
      // Check if user already exists
      const usersData = await storage.getItem('@zada_users');
      const users: AuthUser[] = usersData ? JSON.parse(usersData) : [];
      
      const existingUser = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      
      // Create user
      const userData: AuthUser = {
        id: 'user_' + Date.now(),
        email: data.email.toLowerCase(),
        role: data.role,
        profile: {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          address: data.address
        },
        preferences: {
          notifications: true,
          marketing: false,
          theme: 'light' as const
        },
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      users.push(userData);
      await storage.setItem('@zada_users', JSON.stringify(users));
      
      // Generate simple tokens
      const token = 'token_' + Date.now();
      const refresh_token = 'refresh_' + Date.now();
      
      // Store tokens
      await storage.setItem('@zada_auth_token', token);
      await storage.setItem('@zada_refresh_token', refresh_token);
      await storage.setItem('@zada_current_user', JSON.stringify(userData));
      
      return {
        user: userData,
        token,
        refresh_token,
        expires_in: 24 * 60 * 60 // 24 hours in seconds
      };
      
    } catch (error) {
      throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Validate input
      if (!this.isValidEmail(credentials.email)) {
        throw new Error('Invalid email format');
      }
      
      if (!credentials.password) {
        throw new Error('Password is required');
      }
      
      // Get user from storage
      const usersData = await storage.getItem('@zada_users');
      if (!usersData) {
        throw new Error('No users found. Please register first.');
      }
      
      const users: AuthUser[] = JSON.parse(usersData);
      const foundUser = users.find(
        u => u.email.toLowerCase() === credentials.email.toLowerCase() && 
             u.status === 'active'
      );
      
      if (!foundUser) {
        throw new Error('Invalid credentials or account not active');
      }
      
      // Update last login
      foundUser.last_login_at = new Date().toISOString();
      await storage.setItem('@zada_users', JSON.stringify(users));
      
      // Generate tokens
      const token = 'token_' + Date.now();
      const refresh_token = 'refresh_' + Date.now();
      
      // Store tokens
      await storage.setItem('@zada_auth_token', token);
      await storage.setItem('@zada_refresh_token', refresh_token);
      await storage.setItem('@zada_current_user', JSON.stringify(foundUser));
      
      return {
        user: foundUser,
        token,
        refresh_token,
        expires_in: 24 * 60 * 60
      };
      
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Invalid credentials'}`);
    }
  }
  
  // Logout user
  async logout(): Promise<void> {
    try {
      // Clear stored tokens
      await storage.removeItem('@zada_auth_token');
      await storage.removeItem('@zada_refresh_token');
      await storage.removeItem('@zada_current_user');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  
  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const userData = await storage.getItem('@zada_current_user');
      if (!userData) return null;
      
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
  
  // Validate session
  async validateSession(): Promise<AuthUser | null> {
    try {
      const token = await storage.getItem('@zada_auth_token');
      if (!token) return null;
      
      const user = await this.getCurrentUser();
      return user;
      
    } catch (error) {
      console.error('Session validation failed:', error);
      return null;
    }
  }
  
  // Check if user has permission
  hasPermission(user: AuthUser, permission: string): boolean {
    const permissions = {
      customer: ['view_products', 'create_order', 'view_own_orders', 'update_profile'],
      admin: ['view_products', 'create_order', 'view_own_orders', 'update_profile', 'manage_products', 'manage_orders', 'view_analytics', 'manage_users'],
      super_admin: ['*'] // All permissions
    };
    
    if (user.role === 'super_admin') return true;
    
    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes(permission) || userPermissions.includes('*');
  }
}

export const authService = AuthService.getInstance();
