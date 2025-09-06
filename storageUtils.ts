// Cross-platform storage utility for web and mobile
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Web storage fallback using localStorage
const webStorage = {
  getItem: (key: string): Promise<string | null> => {
    try {
      return Promise.resolve(localStorage.getItem(key));
    } catch (error) {
      console.error('Web storage getItem error:', error);
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
      return Promise.resolve();
    } catch (error) {
      console.error('Web storage setItem error:', error);
      return Promise.resolve();
    }
  },
  removeItem: (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
      return Promise.resolve();
    } catch (error) {
      console.error('Web storage removeItem error:', error);
      return Promise.resolve();
    }
  }
};

// Cross-platform storage interface
export const storage = {
  getItem: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return webStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return webStorage.setItem(key, value);
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return webStorage.removeItem(key);
    }
    return AsyncStorage.removeItem(key);
  }
};
