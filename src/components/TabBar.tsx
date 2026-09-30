import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colours } from '../theme';
import type { TabKey } from '../types';

interface TabBarProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

const tabs: Array<{ key: TabKey; emoji: string; label: string }> = [
  { key: 'pick', emoji: '🎯', label: 'Pick' },
  { key: 'classes', emoji: '👥', label: 'Classes' },
  { key: 'history', emoji: '📊', label: 'History' },
  { key: 'settings', emoji: '⚙️', label: 'Settings' },
];

export function TabBar({ activeTab, onChange }: TabBarProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [styles.tab, active && styles.activeTab, pressed && styles.pressed]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colours.white,
    borderTopColor: colours.border,
    borderTopWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    flexDirection: 'row',
    paddingBottom: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 0,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: colours.white,
    borderBottomColor: colours.purple,
  },
  pressed: {
    opacity: 0.72,
  },
  emoji: {
    fontSize: 19,
  },
  label: {
    color: colours.inkMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  activeLabel: {
    color: colours.purpleDark,
    fontWeight: '700',
  },
});
