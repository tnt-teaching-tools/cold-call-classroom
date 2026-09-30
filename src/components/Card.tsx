import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colours, radius, shadow } from '../theme';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    ...shadow,
    backgroundColor: colours.white,
    borderColor: colours.border,
    borderRadius: radius.large,
    borderWidth: 1,
    padding: 18,
  },
});
