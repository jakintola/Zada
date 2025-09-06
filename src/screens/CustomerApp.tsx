/**
 * Customer App Component
 * Main interface for customer users
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '../contexts/AppContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';

type CustomerView = 'home' | 'products' | 'cart' | 'orders' | 'profile';

const CustomerApp: React.FC = () => {
  const { user, logout, products, cart, customerOrders } = useApp();
  const [currentView, setCurrentView] = useState<CustomerView>('home');

  const renderHome = () => (
    <View style={styles.content}>
      <Text style={styles.welcomeText}>
        Welcome back, {user?.name}! 👋
      </Text>
      
      <Card style={styles.statsCard}>
        <Text style={styles.statsTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{cart.cartCount}</Text>
            <Text style={styles.statLabel}>Items in Cart</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{customerOrders.length}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.quickActionsCard}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <Button
            title="Browse Products"
            onPress={() => setCurrentView('products')}
            style={styles.quickActionButton}
          />
          <Button
            title="View Cart"
            onPress={() => setCurrentView('cart')}
            variant="outline"
            style={styles.quickActionButton}
          />
        </View>
      </Card>
    </View>
  );

  const renderProducts = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Our Products</Text>
      {products.map((product) => (
        <Card key={product.id} style={styles.productCard}>
          <View style={styles.productHeader}>
            <Text style={styles.productIcon}>{product.image}</Text>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>₦{product.price.toLocaleString()}</Text>
            </View>
          </View>
          <Text style={styles.productDescription}>{product.description}</Text>
          <Button
            title="Add to Cart"
            onPress={() => cart.addToCart(product)}
            size="small"
            style={styles.addToCartButton}
          />
        </Card>
      ))}
    </View>
  );

  const renderCart = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Shopping Cart</Text>
      {cart.cart.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Button
            title="Browse Products"
            onPress={() => setCurrentView('products')}
            style={styles.emptyButton}
          />
        </Card>
      ) : (
        <>
          {cart.cart.map((item) => (
            <Card key={item.product.id} style={styles.cartItemCard}>
              <View style={styles.cartItemHeader}>
                <Text style={styles.cartItemIcon}>{item.product.image}</Text>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.product.name}</Text>
                  <Text style={styles.cartItemPrice}>
                    ₦{item.product.price.toLocaleString()} × {item.quantity}
                  </Text>
                </View>
              </View>
              <View style={styles.cartItemActions}>
                <Button
                  title="-"
                  onPress={() => cart.updateQuantity(item.product.id, item.quantity - 1)}
                  size="small"
                  variant="outline"
                />
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <Button
                  title="+"
                  onPress={() => cart.updateQuantity(item.product.id, item.quantity + 1)}
                  size="small"
                  variant="outline"
                />
              </View>
            </Card>
          ))}
          <Card style={styles.cartSummaryCard}>
            <Text style={styles.cartTotalText}>
              Total: ₦{cart.cartTotal.toLocaleString()}
            </Text>
            <Button
              title="Checkout"
              onPress={() => {/* TODO: Implement checkout */}}
              fullWidth
            />
          </Card>
        </>
      )}
    </View>
  );

  const renderOrders = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Your Orders</Text>
      {customerOrders.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No orders yet</Text>
          <Button
            title="Start Shopping"
            onPress={() => setCurrentView('products')}
            style={styles.emptyButton}
          />
        </Card>
      ) : (
        customerOrders.map((order) => (
          <Card key={order.id} style={styles.orderCard}>
            <Text style={styles.orderId}>Order #{order.id}</Text>
            <Text style={styles.orderStatus}>Status: {order.status}</Text>
            <Text style={styles.orderTotal}>Total: ₦{order.total.toLocaleString()}</Text>
          </Card>
        ))
      )}
    </View>
  );

  const renderProfile = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Profile</Text>
      <Card style={styles.profileCard}>
        <Text style={styles.profileLabel}>Name: {user?.name}</Text>
        <Text style={styles.profileLabel}>Email: {user?.email}</Text>
        <Text style={styles.profileLabel}>Role: {user?.role}</Text>
        {user?.phone && <Text style={styles.profileLabel}>Phone: {user.phone}</Text>}
        {user?.address && <Text style={styles.profileLabel}>Address: {user.address}</Text>}
        <Button
          title="Logout"
          onPress={logout}
          variant="danger"
          style={styles.logoutButton}
        />
      </Card>
    </View>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return renderHome();
      case 'products':
        return renderProducts();
      case 'cart':
        return renderCart();
      case 'orders':
        return renderOrders();
      case 'profile':
        return renderProfile();
      default:
        return renderHome();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ZADA Water Delivery</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {renderContent()}
      </ScrollView>

      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[styles.navItem, currentView === 'home' && styles.activeNavItem]}
          onPress={() => setCurrentView('home')}
        >
          <Text style={[styles.navText, currentView === 'home' && styles.activeNavText]}>
            🏠 Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, currentView === 'products' && styles.activeNavItem]}
          onPress={() => setCurrentView('products')}
        >
          <Text style={[styles.navText, currentView === 'products' && styles.activeNavText]}>
            🛍️ Products
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, currentView === 'cart' && styles.activeNavItem]}
          onPress={() => setCurrentView('cart')}
        >
          <Text style={[styles.navText, currentView === 'cart' && styles.activeNavText]}>
            🛒 Cart ({cart.cartCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, currentView === 'orders' && styles.activeNavItem]}
          onPress={() => setCurrentView('orders')}
        >
          <Text style={[styles.navText, currentView === 'orders' && styles.activeNavText]}>
            📦 Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, currentView === 'profile' && styles.activeNavItem]}
          onPress={() => setCurrentView('profile')}
        >
          <Text style={[styles.navText, currentView === 'profile' && styles.activeNavText]}>
            👤 Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  logoutButton: {
    padding: SPACING.sm,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  welcomeText: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  statsCard: {
    marginBottom: SPACING.lg,
  },
  statsTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  quickActionsCard: {
    marginBottom: SPACING.lg,
  },
  quickActionsTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  quickActionButton: {
    flex: 1,
  },
  productCard: {
    marginBottom: SPACING.md,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  productIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  productPrice: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  productDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  addToCartButton: {
    alignSelf: 'flex-start',
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  emptyButton: {
    minWidth: 150,
  },
  cartItemCard: {
    marginBottom: SPACING.md,
  },
  cartItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cartItemIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
  },
  cartItemPrice: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  quantityText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    minWidth: 30,
    textAlign: 'center',
  },
  cartSummaryCard: {
    marginTop: SPACING.lg,
  },
  cartTotalText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  orderCard: {
    marginBottom: SPACING.md,
  },
  orderId: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  orderStatus: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  orderTotal: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginTop: SPACING.xs,
  },
  profileCard: {
    padding: SPACING.lg,
  },
  profileLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  logoutButton: {
    marginTop: SPACING.lg,
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
  },
  activeNavText: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});

export default CustomerApp;
