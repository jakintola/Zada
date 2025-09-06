/**
 * Reusable Input component
 * Consistent input styling and behavior across the app
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING } from '../../constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  helperStyle?: TextStyle;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  testID?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  helperStyle,
  variant = 'outlined',
  size = 'medium',
  fullWidth = false,
  secureTextEntry,
  testID,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const toggleSecure = () => setIsSecure(!isSecure);

  const containerStyles = [
    styles.container,
    fullWidth && styles.fullWidth,
    containerStyle,
  ];

  const inputContainerStyles = [
    styles.inputContainer,
    styles[variant],
    styles[size],
    isFocused && styles.focused,
    error && styles.error,
    props.editable === false && styles.disabled,
  ];

  const inputStyles = [
    styles.input,
    styles[`${size}Input`],
    leftIcon && styles.inputWithLeftIcon,
    (rightIcon || secureTextEntry) && styles.inputWithRightIcon,
    inputStyle,
  ];

  const labelStyles = [
    styles.label,
    styles[`${size}Label`],
    error && styles.errorLabel,
    labelStyle,
  ];

  const errorStyles = [
    styles.errorText,
    styles[`${size}Error`],
    errorStyle,
  ];

  const helperStyles = [
    styles.helperText,
    styles[`${size}Helper`],
    helperStyle,
  ];

  return (
    <View style={containerStyles} testID={testID}>
      {label && <Text style={labelStyles}>{label}</Text>}
      
      <View style={inputContainerStyles}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          style={inputStyles}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isSecure}
          placeholderTextColor={COLORS.gray[400]}
          {...props}
        />
        
        {(rightIcon || secureTextEntry) && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={secureTextEntry ? toggleSecure : onRightIconPress}
            disabled={!onRightIconPress && !secureTextEntry}
          >
            {secureTextEntry ? (
              <Text style={styles.secureIcon}>
                {isSecure ? '👁️' : '🙈'}
              </Text>
            ) : (
              rightIcon
            )}
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={errorStyles}>{error}</Text>}
      {helperText && !error && <Text style={helperStyles}>{helperText}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  fullWidth: {
    width: '100%',
  },
  
  // Label styles
  label: {
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  smallLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  mediumLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  largeLabel: {
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
  errorLabel: {
    color: COLORS.error,
  },
  
  // Input container styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
  },
  default: {
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderRadius: 0,
  },
  outlined: {
    borderWidth: 1,
  },
  filled: {
    backgroundColor: COLORS.gray[50],
    borderWidth: 0,
  },
  
  // Sizes
  small: {
    minHeight: 36,
    paddingHorizontal: 12,
  },
  medium: {
    minHeight: 44,
    paddingHorizontal: 16,
  },
  large: {
    minHeight: 52,
    paddingHorizontal: 20,
  },
  
  // States
  focused: {
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  error: {
    borderColor: COLORS.error,
  },
  disabled: {
    backgroundColor: COLORS.gray[100],
    opacity: 0.6,
  },
  
  // Input styles
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  smallInput: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  mediumInput: {
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  largeInput: {
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
  inputWithLeftIcon: {
    marginLeft: SPACING.sm,
  },
  inputWithRightIcon: {
    marginRight: SPACING.sm,
  },
  
  // Icon styles
  leftIcon: {
    marginRight: SPACING.sm,
  },
  rightIcon: {
    marginLeft: SPACING.sm,
    padding: SPACING.xs,
  },
  secureIcon: {
    fontSize: 16,
  },
  
  // Error and helper text styles
  errorText: {
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  smallError: {
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  mediumError: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  largeError: {
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  
  helperText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  smallHelper: {
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  mediumHelper: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  largeHelper: {
    fontSize: TYPOGRAPHY.fontSize.base,
  },
});

export default Input;
