import { StyleSheet, Text, View } from 'react-native';

import { colours } from '../theme';
import { Button } from './Button';

interface EmptyStateProps {
  emoji: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Button onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 32,
  },
  emoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  title: {
    color: colours.ink,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: colours.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 360,
    textAlign: 'center',
  },
  button: {
    marginTop: 22,
  },
});
