/**
 * Shopping cart management hook
 * Centralized cart state and operations with persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { CartItem, Product } from '../types';
import { showSuccess, showError } from '../utils';
import { storage } from '../../storageUtils';

interface UseCartReturn {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  isLoading: boolean;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartItem: (productId: string) => CartItem | undefined;
  isInCart: (productId: string) => boolean;
  loadCart: (userId: string) => Promise<void>;
  saveCart: (userId: string) => Promise<void>;
}

export const useCart = (): UseCartReturn => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const loadCart = useCallback(async (userId: string): Promise<void> => {
    try {
      setIsLoading(true);
      const cartKey = `@zada_user_${userId}_cart`;
      const storedCart = await storage.getItem(cartKey);
      if (storedCart) {
        const cartData = JSON.parse(storedCart);
        // Convert date strings back to Date objects
        const formattedCart = cartData.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt),
        }));
        setCart(formattedCart);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveCart = useCallback(async (userId: string): Promise<void> => {
    try {
      const cartKey = `@zada_user_${userId}_cart`;
      await storage.setItem(cartKey, JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart:', error);
      showError(error, 'Failed to save cart');
    }
  }, [cart]);

  const addToCart = useCallback(async (product: Product, quantity = 1): Promise<void> => {
    try {
      setCart(prevCart => {
        const existingItem = prevCart.find(item => item.product.id === product.id);
        
        if (existingItem) {
          // Update quantity if item already exists
          const updatedCart = prevCart.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
          return updatedCart;
        } else {
          // Add new item to cart
          const newItem: CartItem = {
            product,
            quantity,
            addedAt: new Date(),
          };
          return [...prevCart, newItem];
        }
      });
      
      showSuccess(`${product.name} added to cart!`);
    } catch (error) {
      showError(error, 'Failed to add item to cart');
    }
  }, []);

  const removeFromCart = useCallback(async (productId: string): Promise<void> => {
    try {
      setCart(prevCart => {
        const item = prevCart.find(item => item.product.id === productId);
        if (item) {
          showSuccess(`${item.product.name} removed from cart`);
        }
        return prevCart.filter(item => item.product.id !== productId);
      });
    } catch (error) {
      showError(error, 'Failed to remove item from cart');
    }
  }, []);

  const updateQuantity = useCallback(async (productId: string, quantity: number): Promise<void> => {
    try {
      if (quantity <= 0) {
        await removeFromCart(productId);
        return;
      }

      setCart(prevCart =>
        prevCart.map(item =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        )
      );
    } catch (error) {
      showError(error, 'Failed to update quantity');
    }
  }, [removeFromCart]);

  const clearCart = useCallback(async (): Promise<void> => {
    try {
      setCart([]);
      showSuccess('Cart cleared successfully');
    } catch (error) {
      showError(error, 'Failed to clear cart');
    }
  }, []);

  const getCartItem = useCallback((productId: string): CartItem | undefined => {
    return cart.find(item => item.product.id === productId);
  }, [cart]);

  const isInCart = useCallback((productId: string): boolean => {
    return cart.some(item => item.product.id === productId);
  }, [cart]);

  return {
    cart,
    cartCount,
    cartTotal,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartItem,
    isInCart,
    loadCart,
    saveCart,
  };
};
