import { StyleSheet, Text, View } from 'react-native';

import { colours, radius } from '../theme';

interface ProgressBarProps {
  percentage: number;
  label: string;
  compact?: boolean;
}

export function ProgressBar({ percentage, label, compact = false }: ProgressBarProps) {
  const safePercentage = Math.max(0, Math.min(100, percentage));
  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={[styles.label, compact && styles.compactLabel]}>{label}</Text>
        <Text style={[styles.value, compact && styles.compactLabel]}>{safePercentage}%</Text>
      </View>
      <View style={[styles.track, compact && styles.compactTrack]}>
        <View style={[styles.fill, { width: `${safePercentage}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: colours.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  value: {
    color: colours.purpleDark,
    fontSize: 14,
    fontWeight: '900',
  },
  compactLabel: {
    fontSize: 12,
  },
  track: {
    backgroundColor: colours.purplePale,
    borderRadius: radius.pill,
    height: 12,
    overflow: 'hidden',
  },
  compactTrack: {
    height: 8,
  },
  fill: {
    backgroundColor: colours.purple,
    borderRadius: radius.pill,
    height: '100%',
  },
});
