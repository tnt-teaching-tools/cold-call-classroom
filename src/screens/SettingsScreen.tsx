import { confirmAction } from '../confirm';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { colours, radius } from '../theme';
import { chooseBackup, downloadBackup } from '../backup';
import type { AppData, AppSettings } from '../types';

interface SettingsScreenProps {
  data: AppData;
  onImportData: (data: AppData) => Promise<void>;
  settings: AppSettings;
  classCount: number;
  historyCount: number;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onDeleteAllData: () => void;
}

export function SettingsScreen({
  data,
  onImportData,
  settings,
  classCount,
  historyCount,
  onUpdateSettings,
  onDeleteAllData,
}: SettingsScreenProps) {
  const [backupStatus, setBackupStatus] = useState('');
  const [importing, setImporting] = useState(false);
  const importBackup = () => chooseBackup((saved) => {
    confirmAction('Replace this browser’s saved data?', `This backup contains ${saved.classes.length} classes and ${saved.history.length} records. It will replace the classes, history and settings saved here. Export a backup first if you want to keep them.`, () => {
      setImporting(true);
      void onImportData(saved).then(() => setBackupStatus('Backup imported. Your classes, history and settings are ready.')).catch(() => setBackupStatus('The backup could not be saved. Your existing data has not been replaced.')).finally(() => setImporting(false));
    });
  }, setBackupStatus);
  const exportBackup = () => {
    try { downloadBackup(data); setBackupStatus('Backup download started. Save the file somewhere private.'); }
    catch (e) { setBackupStatus(e instanceof Error ? e.message : 'The backup could not be exported.'); }
  };
  const confirmDelete = () => {
    confirmAction('Delete all local data?', 'This permanently removes every class, cold-call round and response note from this browser.', onDeleteAllData);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow="Cold Call Classroom"
        title="Teacher settings"
        subtitle="Adjust the cold-call routine and control locally stored data."
      />

      <Card style={styles.proCard}>
        <View style={styles.proCopy}>
          <Text style={styles.settingTitle}>✓ All features included</Text>
          <Text style={styles.settingDescription}>Cold Call Classroom is free, with unlimited saved classes and no paywall.</Text>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Questioning routine</Text>
      <Card style={styles.cardSpacing}>
        <Text style={styles.settingTitle}>Choose a routine</Text>
        <Text style={styles.settingDescription}>Match the routine to the purpose of the question.</Text>
        <View style={styles.optionStack}>
          {([
            ['cold_call', '🎯 Cold Call', 'Everyone thinks before a student is revealed.'],
            ['think_pair_share', '🗣️ Think–Pair–Share', 'Think alone, rehearse with a partner, then share.'],
            ['check_everyone', '✍️ Check Everyone', 'Everyone responds first, then one student explains.'],
          ] as const).map(([value, label, copy]) => (
            <Button key={value} variant={settings.questionRoutine === value ? 'primary' : 'ghost'} onPress={() => onUpdateSettings({ questionRoutine: value })}>
              {label} · {copy}
            </Button>
          ))}
        </View>
      </Card>
      <Card style={styles.cardSpacing}>
        <Text style={styles.settingTitle}>Thinking time before reveal</Text>
        <Text style={styles.settingDescription}>
          Ask the question, start the timer, then reveal who will answer.
        </Text>
        <View style={styles.timeOptions}>
          {[0, 3, 5, 7].map((seconds) => {
            const selected = settings.waitSeconds === seconds;
            return (
              <Button
                compact
                key={seconds}
                onPress={() => onUpdateSettings({ waitSeconds: seconds })}
                style={styles.timeButton}
                variant={selected ? 'primary' : 'ghost'}
              >
                {seconds === 0 ? 'Off' : `${seconds}s`}
              </Button>
            );
          })}
        </View>
        <Text style={styles.recommended}>5 seconds · Recommended starting point</Text>
        <View style={styles.numberRow}>
          <Text style={styles.numberLabel}>Custom thinking time</Text>
          <TextInput
            accessibilityLabel="Custom thinking time in seconds"
            keyboardType="number-pad"
            maxLength={2}
            onChangeText={(text) => {
              const value = Number(text);
              if (value >= 1 && value <= 60) onUpdateSettings({ waitSeconds: Math.round(value) });
            }}
            placeholder="10"
            style={styles.numberInput}
          />
        </View>
        <TimerInput label="Partner rehearsal" value={settings.pairSeconds} max={120} onChange={(pairSeconds) => onUpdateSettings({ pairSeconds })} />
        <TimerInput label="Check everyone" value={settings.checkSeconds} max={120} onChange={(checkSeconds) => onUpdateSettings({ checkSeconds })} />
        <TimerInput label="Pause after an answer" value={settings.postAnswerSeconds} max={15} onChange={(postAnswerSeconds) => onUpdateSettings({ postAnswerSeconds })} />
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.settingTitle}>Show fair-coverage progress</Text>
            <Text style={styles.settingDescription}>Display the round progress bar in projector view.</Text>
          </View>
          <Switch
            accessibilityLabel="Show coverage progress to class"
            onValueChange={(value) => onUpdateSettings({ showProgressToClass: value })}
            value={settings.showProgressToClass}
            trackColor={{ false: colours.border, true: colours.purplePale }}
            thumbColor={settings.showProgressToClass ? colours.purple : colours.inkMuted}
          />
        </View>
      </Card>

      <Card style={styles.cardSpacing}>
        <Text style={styles.settingTitle}>How should students be selected?</Text>
        <Text style={styles.settingDescription}>Choose the balance between coverage and unpredictability.</Text>
        <View style={styles.optionStack}>
          {([
            ['whole_class', '✓ Whole Class', 'Everyone once before a new shuffled round.'],
            ['random', '↝ Fully Random', 'Any student may be selected at any time.'],
            ['mixed', '⚡ Keep Them Thinking', 'Fair coverage with occasional revisits.'],
          ] as const).map(([value, label, copy]) => (
            <Button key={value} variant={settings.selectionMode === value ? 'primary' : 'ghost'} onPress={() => onUpdateSettings({ selectionMode: value })}>
              {label} · {copy}
            </Button>
          ))}
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Data protection</Text>
      <Card style={styles.cardSpacing}>
        <View style={styles.privacyHero}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>Privacy by design</Text>
            <Text style={styles.privacyText}>Class information stays in this browser. Backup files are saved on your device.</Text>
          </View>
        </View>
        <PrivacyRule text="Only a first name and one surname initial are accepted." />
        <PrivacyRule text="Full surnames are rejected during entry and safe-list importing." />
        <PrivacyRule text="Students do not create accounts or provide contact details." />
        <PrivacyRule text="Response notes are private and never appear in projector view." />
        <PrivacyRule text="Teachers can permanently delete classes and history." />
      </Card>

      {Platform.OS === 'web' ? <>
        <Text style={styles.sectionTitle}>Back up or move between devices</Text>
        <Card style={styles.cardSpacing}>
          <Text style={styles.settingDescription}>Export your classes, attendance, participation history, rounds and settings as a backup file. Move that file privately to your other device, open this website there and choose Import backup.</Text>
          <View style={styles.optionStack}>
            <Button onPress={exportBackup} disabled={importing}>Export backup</Button>
            <Button variant="ghost" onPress={importBackup} disabled={importing}>Import backup</Button>
          </View>
          <Text style={styles.settingDescription}>This is a manual transfer. Devices do not sync automatically. The file contains student information: keep it private and avoid shared or public links. Import replaces the data on this browser.</Text>
          {backupStatus ? <Text accessibilityRole="alert" style={styles.settingDescription}>{backupStatus}</Text> : null}
        </Card>
      </> : null}
      <Text style={styles.sectionTitle}>Local data</Text>
      <Card style={styles.cardSpacing}>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Classes stored</Text>
          <Text style={styles.dataValue}>{classCount}</Text>
        </View>
        <View style={[styles.dataRow, styles.dataBorder]}>
          <Text style={styles.dataLabel}>Cold-call records</Text>
          <Text style={styles.dataValue}>{historyCount}</Text>
        </View>
        <Button variant="danger" onPress={confirmDelete} style={styles.deleteButton}>
          Delete all local data
        </Button>
      </Card>

      <View style={styles.versionBox}>
        <Text style={styles.versionBrand}>Cold Call Classroom</Text>
        <Text style={styles.versionText}>Website · Version 1.0.1</Text>
        <Text style={styles.versionNote}>No account or cloud storage required.</Text>
      </View>
    </ScrollView>
  );
}

function TimerInput({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.numberRow}>
      <Text style={styles.numberLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={`${label} in seconds`}
        keyboardType="number-pad"
        maxLength={3}
        onChangeText={(text) => {
          const next = Number(text);
          if (next >= 0 && next <= max) onChange(Math.round(next));
        }}
        style={styles.numberInput}
        value={String(value)}
      />
    </View>
  );
}

function PrivacyRule({ text }: { text: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleTick}>
        <Text style={styles.ruleTickText}>✓</Text>
      </View>
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 42,
  },
  sectionTitle: {
    color: colours.ink,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 4,
  },
  cardSpacing: {
    marginBottom: 22,
  },
  proCard: {
    alignItems: 'center',
    backgroundColor: colours.purplePale,
    flexDirection: 'row',
    marginBottom: 20,
  },
  proCopy: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    color: colours.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  settingDescription: {
    color: colours.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  timeOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  optionStack: {
    gap: 9,
    marginTop: 14,
  },
  recommended: {
    color: '#167A55',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
  },
  numberRow: {
    alignItems: 'center',
    borderTopColor: colours.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
  },
  numberLabel: {
    color: colours.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  numberInput: {
    backgroundColor: colours.canvas,
    borderColor: colours.border,
    borderRadius: radius.small,
    borderWidth: 1,
    color: colours.ink,
    fontSize: 15,
    fontWeight: '800',
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  timeButton: {
    flex: 1,
  },
  switchRow: {
    alignItems: 'center',
    borderTopColor: colours.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: 18,
    paddingTop: 18,
  },
  switchCopy: {
    flex: 1,
    marginRight: 12,
  },
  privacyHero: {
    alignItems: 'center',
    backgroundColor: colours.cyanPale,
    borderRadius: radius.medium,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 14,
  },
  privacyIcon: {
    fontSize: 34,
    marginRight: 12,
  },
  privacyCopy: {
    flex: 1,
  },
  privacyTitle: {
    color: colours.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  privacyText: {
    color: colours.inkMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  ruleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginBottom: 11,
  },
  ruleTick: {
    alignItems: 'center',
    backgroundColor: colours.mintPale,
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    width: 22,
  },
  ruleTickText: {
    color: '#167A55',
    fontSize: 12,
    fontWeight: '900',
  },
  ruleText: {
    color: colours.ink,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  dataRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  dataBorder: {
    borderTopColor: colours.border,
    borderTopWidth: 1,
  },
  dataLabel: {
    color: colours.inkMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  dataValue: {
    color: colours.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  deleteButton: {
    marginTop: 14,
  },
  versionBox: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  versionBrand: {
    color: colours.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  versionText: {
    color: colours.inkMuted,
    fontSize: 11,
    marginTop: 3,
  },
  versionNote: {
    color: colours.inkMuted,
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
});
