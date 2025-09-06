/**
 * Products management hook
 * Centralized product state and operations with proper error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { showError, showSuccess } from '../utils';
import { storage } from '../../storageUtils';
import { supabase } from '../../supabaseClient';

interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  loadProducts: () => Promise<void>;
  saveProducts: (products: Product[]) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  getProductById: (id: string) => Product | undefined;
  getProductsByCategory: (category: string) => Product[];
  searchProducts: (query: string) => Product[];
}

// Mock products data
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Premium Water 20L',
    price: 1200,
    stock: 50,
    minStock: 10,
    category: 'water',
    supplier: 'AquaPure',
    image: '💧',
    description: 'Premium purified water in 20L container',
    features: ['BPA Free', 'Purified', '20L Capacity']
  },
  {
    id: '2',
    name: 'Water Dispenser',
    price: 25000,
    stock: 15,
    minStock: 5,
    category: 'dispenser',
    supplier: 'CoolTech',
    image: '🚰',
    description: 'Electric water dispenser with hot and cold options',
    features: ['Hot & Cold', 'Energy Efficient', 'Easy to Clean']
  },
  {
    id: '3',
    name: 'Water Filter',
    price: 8500,
    stock: 30,
    minStock: 8,
    category: 'accessories',
    supplier: 'FilterPro',
    image: '🔧',
    description: 'Advanced water filtration system',
    features: ['Multi-stage Filtration', 'Long Lasting', 'Easy Installation']
  }
];

export const useProducts = (): UseProductsReturn => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadProducts = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Try Supabase first
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error('Supabase products fetch failed');
        }

        if (data && data.length > 0) {
          const formattedProducts: Product[] = data.map(item => ({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            stock: item.stock,
            minStock: item.min_stock,
            category: item.category,
            supplier: item.supplier,
            image: item.image,
            description: item.description || '',
            features: item.features || [],
          }));
          setProducts(formattedProducts);
          return;
        }
      } catch (supabaseError) {
        console.log('Supabase products fetch failed, using localStorage fallback');
      }

      // Fallback to localStorage
      const storedProducts = await storage.getItem('@zada_products');
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      } else {
        // Initialize with mock data if no stored data
        setProducts(mockProducts);
        await storage.setItem('@zada_products', JSON.stringify(mockProducts));
      }
    } catch (error) {
      console.error('Error loading products:', error);
      showError(error, 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProducts = useCallback(async (productsToSave: Product[]): Promise<void> => {
    try {
      // Try Supabase first
      try {
        // Delete existing products
        await supabase.from('products').delete().neq('id', '');
        
        // Insert new products
        const formattedProducts = productsToSave.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price.toString(),
          stock: product.stock,
          min_stock: product.minStock,
          category: product.category,
          supplier: product.supplier,
          image: product.image,
          description: product.description,
          features: product.features,
        }));

        const { error } = await supabase
          .from('products')
          .insert(formattedProducts);

        if (error) {
          throw new Error('Supabase products save failed');
        }
      } catch (supabaseError) {
        console.log('Supabase products save failed, using localStorage fallback');
      }

      // Fallback to localStorage
      await storage.setItem('@zada_products', JSON.stringify(productsToSave));
    } catch (error) {
      console.error('Error saving products:', error);
      showError(error, 'Failed to save products');
    }
  }, []);

  const addProduct = useCallback(async (productData: Omit<Product, 'id'>): Promise<boolean> => {
    try {
      const newProduct: Product = {
        ...productData,
        id: Date.now().toString(),
      };

      const updatedProducts = [...products, newProduct];
      setProducts(updatedProducts);
      await saveProducts(updatedProducts);
      showSuccess('Product added successfully!');
      return true;
    } catch (error) {
      showError(error, 'Failed to add product');
      return false;
    }
  }, [products, saveProducts]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>): Promise<boolean> => {
    try {
      const updatedProducts = products.map(product =>
        product.id === id ? { ...product, ...updates } : product
      );

      setProducts(updatedProducts);
      await saveProducts(updatedProducts);
      showSuccess('Product updated successfully!');
      return true;
    } catch (error) {
      showError(error, 'Failed to update product');
      return false;
    }
  }, [products, saveProducts]);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      const updatedProducts = products.filter(product => product.id !== id);
      setProducts(updatedProducts);
      await saveProducts(updatedProducts);
      showSuccess('Product deleted successfully!');
      return true;
    } catch (error) {
      showError(error, 'Failed to delete product');
      return false;
    }
  }, [products, saveProducts]);

  const getProductById = useCallback((id: string): Product | undefined => {
    return products.find(product => product.id === id);
  }, [products]);

  const getProductsByCategory = useCallback((category: string): Product[] => {
    if (category === 'all') return products;
    return products.filter(product => product.category === category);
  }, [products]);

  const searchProducts = useCallback((query: string): Product[] => {
    if (!query.trim()) return products;
    const lowercaseQuery = query.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowercaseQuery) ||
      product.description.toLowerCase().includes(lowercaseQuery) ||
      product.supplier.toLowerCase().includes(lowercaseQuery)
    );
  }, [products]);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products,
    isLoading,
    loadProducts,
    saveProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    getProductsByCategory,
    searchProducts,
  };
};
