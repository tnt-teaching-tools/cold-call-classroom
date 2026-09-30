import { StyleSheet, Text, View } from 'react-native';

import { colours } from '../theme';

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ eyebrow, title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  eyebrow: {
    color: colours.purple,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  title: {
    color: colours.ink,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colours.inkMuted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
});
