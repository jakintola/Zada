/**
 * Authentication Screen Component
 * Handles user login and registration with proper form validation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useApp } from '../contexts/AppContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../constants';
import { validateEmail, validatePassword } from '../utils';

const AuthScreen: React.FC = () => {
  const { login, register, isLoading } = useApp();
  
  // Form state
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer' as 'customer' | 'admin',
    phone: '',
    address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!isLoginMode) {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }

      if (formData.role === 'admin') {
        const email = formData.email.trim().toLowerCase();
        const allowedDomains = ['@zadafoods.com', '@zada.com'];
        const allowedEmails = ['admin@zada.com', 'manager@zada.com', 'supervisor@zada.com'];
        
        const isAllowedDomain = allowedDomains.some(domain => email.endsWith(domain));
        const isAllowedEmail = allowedEmails.includes(email);
        
        if (!isAllowedDomain && !isAllowedEmail) {
          newErrors.email = 'Admin accounts require @zadafoods.com or @zada.com email addresses';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    const success = isLoginMode
      ? await login({ email: formData.email, password: formData.password })
      : await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          phone: formData.phone,
          address: formData.address,
        });

    if (success) {
      // Reset form on successful authentication
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'customer',
        phone: '',
        address: '',
      });
      setErrors({});
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Toggle between login and register modes
  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setErrors({});
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'customer',
      phone: '',
      address: '',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading text="Authenticating..." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>ZADA Water Delivery</Text>
            <Text style={styles.subtitle}>
              {isLoginMode ? 'Welcome back!' : 'Create your account'}
            </Text>
          </View>

          <Card style={styles.formCard}>
            {!isLoginMode && (
              <Input
                label="Full Name"
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                error={errors.name}
                placeholder="Enter your full name"
                autoCapitalize="words"
              />
            )}

            <Input
              label="Email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              error={errors.email}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              error={errors.password}
              placeholder="Enter your password"
              secureTextEntry
            />

            {!isLoginMode && (
              <>
                <View style={styles.roleSelector}>
                  <Text style={styles.roleLabel}>Account Type:</Text>
                  <View style={styles.roleButtons}>
                    <Button
                      title="Customer"
                      variant={formData.role === 'customer' ? 'primary' : 'outline'}
                      size="small"
                      onPress={() => handleInputChange('role', 'customer')}
                      style={styles.roleButton}
                    />
                    <Button
                      title="Admin"
                      variant={formData.role === 'admin' ? 'primary' : 'outline'}
                      size="small"
                      onPress={() => handleInputChange('role', 'admin')}
                      style={styles.roleButton}
                    />
                  </View>
                  {formData.role === 'admin' && (
                    <Text style={styles.adminHint}>
                      💡 Admin accounts require @zadafoods.com or @zada.com email address
                    </Text>
                  )}
                </View>

                <Input
                  label="Phone (Optional)"
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />

                <Input
                  label="Address (Optional)"
                  value={formData.address}
                  onChangeText={(value) => handleInputChange('address', value)}
                  placeholder="Enter your address"
                  multiline
                  numberOfLines={2}
                />
              </>
            )}

            <Button
              title={isLoginMode ? 'Sign In' : 'Create Account'}
              onPress={handleSubmit}
              fullWidth
              style={styles.submitButton}
            />

            <Button
              title={isLoginMode ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              variant="ghost"
              onPress={toggleMode}
              fullWidth
              style={styles.toggleButton}
            />
          </Card>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

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
  scrollContainer: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    padding: SPACING.xl,
  },
  roleSelector: {
    marginBottom: SPACING.lg,
  },
  roleLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  roleButton: {
    flex: 1,
  },
  adminHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
  toggleButton: {
    marginTop: SPACING.md,
  },
});

export default AuthScreen;
