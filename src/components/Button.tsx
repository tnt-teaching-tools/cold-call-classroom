import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colours, radius } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  children: ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const variantStyles = {
  primary: { backgroundColor: colours.purple, borderColor: colours.purple, color: colours.white },
  secondary: { backgroundColor: colours.purplePale, borderColor: colours.purplePale, color: colours.purpleDark },
  ghost: { backgroundColor: colours.white, borderColor: colours.border, color: colours.ink },
  danger: { backgroundColor: colours.dangerPale, borderColor: colours.dangerPale, color: colours.danger },
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  compact = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const palette = variantStyles[variant];
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : styles.regular,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.color} />
      ) : (
        <Text style={[styles.label, compact && styles.compactLabel, { color: palette.color }]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.medium,
    borderWidth: 1,
    justifyContent: 'center',
  },
  regular: {
    minHeight: 54,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  compact: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  label: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  compactLabel: {
    fontSize: 14,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.42,
  },
});
