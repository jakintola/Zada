/**
 * Authentication hook for managing user state and auth operations
 * Centralized authentication logic with proper error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { AppUser, LoginForm, RegisterForm } from '../types';
import { validateEmail, validatePassword, showError, showSuccess } from '../utils';
import { storage } from '../../storageUtils';
import { supabase } from '../../supabaseClient';
import { ADMIN_EMAIL_DOMAINS, ALLOWED_ADMIN_EMAILS } from '../constants';

interface UseAuthReturn {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (form: LoginForm) => Promise<boolean>;
  register: (form: RegisterForm) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AppUser>) => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on mount
  useEffect(() => {
    loadUserFromStorage();
  }, []);

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
    const isAllowedDomain = ADMIN_EMAIL_DOMAINS.some(domain => 
      normalizedEmail.endsWith(domain)
    );
    const isAllowedEmail = ALLOWED_ADMIN_EMAILS.includes(normalizedEmail);
    return isAllowedDomain || isAllowedEmail;
  };

  const login = useCallback(async (form: LoginForm): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Validate input
      if (!form.email.trim() || !form.password.trim()) {
        Alert.alert('Missing Information', 'Please enter both email and password');
        return false;
      }

      if (!validateEmail(form.email)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address');
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
        showSuccess('Login successful!');
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
      showSuccess('Login successful!');
      return true;
    } catch (error) {
      showError(error, 'Login failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (form: RegisterForm): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Validate input
      if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
        Alert.alert('Missing Information', 'Please fill in all required fields');
        return false;
      }

      if (!validateEmail(form.email)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address');
        return false;
      }

      if (!validatePassword(form.password)) {
        Alert.alert('Invalid Password', 'Password must be at least 6 characters long');
        return false;
      }

      // Validate admin email if admin role
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
        showSuccess('Registration successful!');
        return true;
      } catch (supabaseError) {
        console.log('Supabase registration failed, using localStorage fallback');
      }

      // Fallback to localStorage
      const usersData = await storage.getItem('@zada_users');
      const users: AppUser[] = usersData ? JSON.parse(usersData) : [];

      // Check if email already exists
      const emailExists = users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase());
      if (emailExists) {
        Alert.alert('Email Already Exists', 'An account with this email already exists');
        return false;
      }

      users.push(newUser);
      await storage.setItem('@zada_users', JSON.stringify(users));

      setUser(newUser);
      await saveUserToStorage(newUser);
      showSuccess('Registration successful!');
      return true;
    } catch (error) {
      showError(error, 'Registration failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setUser(null);
      await storage.removeItem('@zada_current_user');
      showSuccess('Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<AppUser>): Promise<void> => {
    if (!user) return;

    try {
      const updatedUser = { ...user, ...updates, updated_at: new Date().toISOString() };
      
      // Try Supabase first
      try {
        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id);

        if (error) {
          throw new Error('Supabase update failed');
        }
      } catch (supabaseError) {
        console.log('Supabase update failed, using localStorage fallback');
        
        // Fallback to localStorage
        const usersData = await storage.getItem('@zada_users');
        if (usersData) {
          const users: AppUser[] = JSON.parse(usersData);
          const userIndex = users.findIndex(u => u.id === user.id);
          if (userIndex !== -1) {
            users[userIndex] = updatedUser;
            await storage.setItem('@zada_users', JSON.stringify(users));
          }
        }
      }

      setUser(updatedUser);
      await saveUserToStorage(updatedUser);
    } catch (error) {
      showError(error, 'Failed to update user information');
    }
  }, [user]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
  };
};
