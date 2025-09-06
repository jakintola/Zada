/**
 * Admin App Component
 * Main interface for admin users
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

type AdminView = 'dashboard' | 'inventory' | 'orders' | 'analytics' | 'support';

const AdminApp: React.FC = () => {
  const { user, logout, products, adminOrders } = useApp();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');

  const renderDashboard = () => (
    <View style={styles.content}>
      <Text style={styles.welcomeText}>
        Welcome, {user?.name}! 👨‍💼
      </Text>
      
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{products.length}</Text>
          <Text style={styles.statLabel}>Total Products</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{adminOrders.length}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>
            {adminOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length}
          </Text>
          <Text style={styles.statLabel}>Pending Orders</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>
            ₦{adminOrders.reduce((sum, order) => sum + order.total, 0).toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </Card>
      </View>

      <Card style={styles.quickActionsCard}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <Button
            title="Manage Inventory"
            onPress={() => setCurrentView('inventory')}
            style={styles.quickActionButton}
          />
          <Button
            title="View Orders"
            onPress={() => setCurrentView('orders')}
            variant="outline"
            style={styles.quickActionButton}
          />
        </View>
      </Card>
    </View>
  );

  const renderInventory = () => (
    <View style={styles.content}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Inventory Management</Text>
        <Button
          title="Add Product"
          onPress={() => {/* TODO: Implement add product */}}
          size="small"
        />
      </View>
      
      {products.map((product) => (
        <Card key={product.id} style={styles.productCard}>
          <View style={styles.productHeader}>
            <Text style={styles.productIcon}>{product.image}</Text>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>₦{product.price.toLocaleString()}</Text>
              <Text style={styles.productStock}>
                Stock: {product.stock} (Min: {product.minStock})
              </Text>
            </View>
          </View>
          <View style={styles.productActions}>
            <Button
              title="Edit"
              onPress={() => {/* TODO: Implement edit product */}}
              size="small"
              variant="outline"
            />
            <Button
              title="Delete"
              onPress={() => {/* TODO: Implement delete product */}}
              size="small"
              variant="danger"
            />
          </View>
        </Card>
      ))}
    </View>
  );

  const renderOrders = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Order Management</Text>
      
      {adminOrders.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No orders yet</Text>
        </Card>
      ) : (
        adminOrders.map((order) => (
          <Card key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>Order #{order.id}</Text>
              <Text style={[styles.orderStatus, { color: getStatusColor(order.status) }]}>
                {order.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.customerName}>{order.customerName}</Text>
            <Text style={styles.orderTotal}>Total: ₦{order.total.toLocaleString()}</Text>
            <Text style={styles.orderDate}>
              {new Date(order.orderDate).toLocaleDateString()}
            </Text>
            <View style={styles.orderActions}>
              <Button
                title="View Details"
                onPress={() => {/* TODO: Implement view details */}}
                size="small"
                variant="outline"
              />
              <Button
                title="Update Status"
                onPress={() => {/* TODO: Implement update status */}}
                size="small"
              />
            </View>
          </Card>
        ))
      )}
    </View>
  );

  const renderAnalytics = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Analytics & Reports</Text>
      
      <Card style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>Revenue Analytics</Text>
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsValue}>
              ₦{adminOrders.reduce((sum, order) => sum + order.total, 0).toLocaleString()}
            </Text>
            <Text style={styles.analyticsLabel}>Total Revenue</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsValue}>
              {adminOrders.length}
            </Text>
            <Text style={styles.analyticsLabel}>Total Orders</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>Product Analytics</Text>
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsValue}>
              {products.length}
            </Text>
            <Text style={styles.analyticsLabel}>Total Products</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsValue}>
              {products.filter(p => p.stock <= p.minStock).length}
            </Text>
            <Text style={styles.analyticsLabel}>Low Stock Items</Text>
          </View>
        </View>
      </Card>
    </View>
  );

  const renderSupport = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Customer Support</Text>
      
      <Card style={styles.supportCard}>
        <Text style={styles.supportText}>
          Support inbox and customer communication tools will be implemented here.
        </Text>
        <Button
          title="Open Support Chat"
          onPress={() => {/* TODO: Implement support chat */}}
          style={styles.supportButton}
        />
      </Card>
    </View>
  );

  const getStatusColor = (status: string) => {
    const colors = {
      pending: COLORS.warning,
      confirmed: COLORS.info,
      out_for_delivery: COLORS.primary,
      delivered: COLORS.success,
      cancelled: COLORS.error,
    };
    return colors[status as keyof typeof colors] || COLORS.textSecondary;
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboard();
      case 'inventory':
        return renderInventory();
      case 'orders':
        return renderOrders();
      case 'analytics':
        return renderAnalytics();
      case 'support':
        return renderSupport();
      default:
        return renderDashboard();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {renderContent()}
      </ScrollView>

      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[styles.navItem, currentView === 'dashboard' && styles.activeNavItem]}
          onPress={() => setCurrentView('dashboard')}
        >
          <Text style={[styles.navText, currentView === 'dashboard' && styles.activeNavText]}>
            📊 Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, currentView === 'inventory' && styles.activeNavItem]}
          onPress={() => setCurrentView('inventory')}
        >
          <Text style={[styles.navText, currentView === 'inventory' && styles.activeNavText]}>
            📦 Inventory
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, currentView === 'orders' && styles.activeNavItem]}
          onPress={() => setCurrentView('orders')}
        >
          <Text style={[styles.navText, currentView === 'orders' && styles.activeNavText]}>
            🛒 Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, currentView === 'analytics' && styles.activeNavItem]}
          onPress={() => setCurrentView('analytics')}
        >
          <Text style={[styles.navText, currentView === 'analytics' && styles.activeNavText]}>
            📈 Analytics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, currentView === 'support' && styles.activeNavItem]}
          onPress={() => setCurrentView('support')}
        >
          <Text style={[styles.navText, currentView === 'support' && styles.activeNavText]}>
            💬 Support
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: SPACING.lg,
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
    textAlign: 'center',
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
  productStock: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textSecondary,
  },
  orderCard: {
    marginBottom: SPACING.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  orderId: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  orderStatus: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  customerName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  orderTotal: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  orderDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  analyticsCard: {
    marginBottom: SPACING.lg,
  },
  analyticsTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  analyticsItem: {
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  analyticsLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  supportCard: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  supportText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  supportButton: {
    minWidth: 150,
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

export default AdminApp;
