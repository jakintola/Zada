/**
 * Reusable Card component
 * Consistent card styling and behavior across the app
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING } from '../../constants';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  margin?: 'none' | 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  testID?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  variant = 'default',
  padding = 'medium',
  margin = 'none',
  fullWidth = false,
  testID,
}) => {
  const cardStyle = [
    styles.base,
    styles[variant],
    styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}`],
    styles[`margin${margin.charAt(0).toUpperCase() + margin.slice(1)}`],
    fullWidth && styles.fullWidth,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  
  // Variants
  default: {
    ...SHADOWS.sm,
  },
  elevated: {
    ...SHADOWS.lg,
  },
  outlined: {
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.none,
  },
  filled: {
    backgroundColor: COLORS.gray[50],
    ...SHADOWS.none,
  },
  
  // Padding
  paddingNone: {
    padding: 0,
  },
  paddingSmall: {
    padding: SPACING.sm,
  },
  paddingMedium: {
    padding: SPACING.md,
  },
  paddingLarge: {
    padding: SPACING.lg,
  },
  
  // Margin
  marginNone: {
    margin: 0,
  },
  marginSmall: {
    margin: SPACING.sm,
  },
  marginMedium: {
    margin: SPACING.md,
  },
  marginLarge: {
    margin: SPACING.lg,
  },
  
  // Full width
  fullWidth: {
    width: '100%',
  },
});

export default Card;
