import { databaseService, DatabaseUser } from './database';
import { storage } from '../../storageUtils';

export interface AuthUser {
  id: string;
  email: string;
  role: 'customer' | 'admin';
  profile: {
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
  };
  created_at: string;
  updated_at: string;
}

class AuthService {
  private currentUser: AuthUser | null = null;

  async login(email: string, password: string): Promise<AuthUser | null> {
    try {
      console.log('🔐 Attempting login for:', email);
      console.log('🔐 Password length:', password.length);
      
      // For demo purposes, we'll accept any password (6+ characters)
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Get user from database
      console.log('🔍 Searching for user in database...');
      const user = await databaseService.getUserByEmail(email);
      
      if (!user) {
        console.log('❌ User not found:', email);
        console.log('🔍 Available users:', await databaseService.getAllUsers().then(users => 
          users.map(u => ({ email: u.email, role: u.role }))
        ));
        return null;
      }

      console.log('✅ User found:', user.email, 'Role:', user.role);
      
      // Store current user
      this.currentUser = user;
      await storage.setItem('@zada_current_user', JSON.stringify(user));
      
      return user;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  async register(userData: {
    email: string;
    role: 'customer' | 'admin';
    profile: {
      first_name: string;
      last_name: string;
      phone?: string;
      address?: string;
    };
  }): Promise<AuthUser> {
    try {
      console.log('📝 Attempting registration for:', userData.email);
      
      // Check if user already exists
      const existingUser = await databaseService.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create new user
      const newUser = await databaseService.createUser(userData);
      
      console.log('✅ User registered successfully:', newUser.email);
      
      // Store current user
      this.currentUser = newUser;
      await storage.setItem('@zada_current_user', JSON.stringify(newUser));
      
      return newUser;
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('🚪 Logging out user:', this.currentUser?.email);
      
      this.currentUser = null;
      await storage.removeItem('@zada_current_user');
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const userData = await storage.getItem('@zada_current_user');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      }
    } catch (error) {
      console.error('❌ Error loading current user:', error);
    }

    return null;
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  async isAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === 'admin';
  }

  async isCustomer(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === 'customer';
  }

  async validateSession(): Promise<AuthUser | null> {
    try {
      console.log('🔍 Validating user session...');
      const user = await this.getCurrentUser();
      
      if (user) {
        console.log('✅ Valid session found for:', user.email);
        return user;
      } else {
        console.log('❌ No valid session found');
        return null;
      }
    } catch (error) {
      console.error('❌ Session validation error:', error);
      return null;
    }
  }

  // Admin-specific methods
  async createAdminUser(adminData: {
    email: string;
    profile: {
      first_name: string;
      last_name: string;
      phone?: string;
      address?: string;
    };
  }): Promise<AuthUser> {
    // Only allow admin creation with specific email domains
    const allowedDomains = ['@zadafoods.com', '@zada.com'];
    const isAllowedDomain = allowedDomains.some(domain => 
      adminData.email.toLowerCase().endsWith(domain)
    );

    if (!isAllowedDomain) {
      throw new Error('Admin accounts can only be created with @zadafoods.com or @zada.com email addresses');
    }

    return this.register({
      ...adminData,
      role: 'admin'
    });
  }

  // Initialize authentication system
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing authentication system...');
      
      // Clear existing data to force recreation (for testing)
      await databaseService.clearAllData();
      
      // Initialize sample data
      await databaseService.initializeSampleData();
      
      // Check for existing user session
      const user = await this.getCurrentUser();
      if (user) {
        console.log('👤 Existing user session found:', user.email);
      } else {
        console.log('👤 No existing user session');
      }
      
      console.log('✅ Authentication system initialized');
    } catch (error) {
      console.error('❌ Error initializing authentication system:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();