/**
 * ZADA Water Delivery App - Refactored with Best Practices
 * 
 * This is the main application component that has been refactored to follow
 * React Native and TypeScript best practices including:
 * - Proper component structure and separation of concerns
 * - Custom hooks for state management
 * - Context API for global state
 * - Reusable components
 * - Error boundaries
 * - Type safety
 * - Performance optimizations
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// Context and Hooks
import { AppProvider, useApp } from './src/contexts/AppContext';

// Components
import ErrorBoundary from './src/components/common/ErrorBoundary';
import Loading from './src/components/common/Loading';
import AuthScreen from './src/screens/AuthScreen';
import CustomerApp from './src/screens/CustomerApp';
import AdminApp from './src/screens/AdminApp';

// Constants
import { COLORS } from './src/constants';

/**
 * Main App Content Component
 * Renders the appropriate screen based on authentication state
 */
const AppContent: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useApp();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading text="Loading..." />
      </View>
    );
  }

  // Show authentication screen if not logged in
  if (!isAuthenticated || !user) {
    return <AuthScreen />;
  }

  // Show appropriate app based on user role
  if (user.role === 'admin') {
    return <AdminApp />;
  }

  return <CustomerApp />;
};

/**
 * Main App Component
 * Wraps the entire app with providers and error boundary
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar
            barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
            backgroundColor={COLORS.primary}
          />
          <ExpoStatusBar style="auto" />
          <AppContent />
        </SafeAreaView>
      </AppProvider>
    </ErrorBoundary>
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
    backgroundColor: COLORS.background,
  },
});

export default App;
