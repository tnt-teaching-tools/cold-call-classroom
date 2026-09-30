import { confirmAction } from '../confirm';
import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { colours, radius } from '../theme';
import type { ClassRoster, Outcome, PickRecord } from '../types';

interface HistoryScreenProps {
  activeClass?: ClassRoster;
  history: PickRecord[];
  onClearHistory: (classId: string) => void;
  onGoToPicker: () => void;
}

const outcomeMeta: Record<Outcome, { label: string; colour: string; pale: string }> = {
  correct: { label: 'Correct', colour: '#167A55', pale: colours.mintPale },
  partial: { label: 'Partial', colour: '#9A6500', pale: colours.yellowPale },
  not_yet: { label: 'Not yet', colour: colours.danger, pale: colours.coralPale },
  unmarked: { label: 'Unmarked', colour: colours.inkMuted, pale: '#EEF0F5' },
};

export function HistoryScreen({ activeClass, history, onClearHistory, onGoToPicker }: HistoryScreenProps) {
  const classHistory = useMemo(
    () => history.filter((record) => record.classId === activeClass?.id),
    [history, activeClass?.id],
  );

  const summary = useMemo(() => {
    const uniqueStudents = new Set(classHistory.map((record) => record.studentId)).size;
    const correct = classHistory.filter((record) => record.outcome === 'correct').length;
    const supported = classHistory.filter(
      (record) => record.outcome === 'partial' || record.outcome === 'not_yet',
    ).length;
    return { uniqueStudents, correct, supported };
  }, [classHistory]);

  const confirmClear = () => {
    if (!activeClass) return;
    confirmAction(`Clear ${activeClass.name} history?`, 'This permanently deletes response notes and cold-call records for this class.', () => onClearHistory(activeClass.id));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow="Teacher-only view"
        title="Participation history"
        subtitle={activeClass ? activeClass.name : 'Choose a class before recording participation.'}
      />

      {!activeClass || classHistory.length === 0 ? (
        <Card>
          <EmptyState
            emoji="📊"
            title="No cold calls recorded"
            message="Cold calls and private response notes will appear here. They are never shown in projector view."
            actionLabel={activeClass ? 'Begin cold calling' : undefined}
            onAction={activeClass ? onGoToPicker : undefined}
          />
        </Card>
      ) : (
        <>
          <View style={styles.summaryGrid}>
            <SummaryCard value={classHistory.length} label="Cold calls" colour={colours.purple} pale={colours.purplePale} />
            <SummaryCard value={summary.uniqueStudents} label="Students heard" colour={colours.cyan} pale={colours.cyanPale} />
            <SummaryCard value={summary.correct} label="Correct" colour={colours.mint} pale={colours.mintPale} />
            <SummaryCard value={summary.supported} label="To support" colour={colours.coral} pale={colours.coralPale} />
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Most recent</Text>
            <Button compact variant="danger" onPress={confirmClear}>
              Clear history
            </Button>
          </View>

          <Card style={styles.historyCard}>
            {classHistory.slice(0, 100).map((record, index) => {
              const outcome = outcomeMeta[record.outcome];
              return (
                <View key={record.id} style={[styles.historyRow, index > 0 && styles.historyBorder]}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatar}>{record.studentAvatar}</Text>
                  </View>
                  <View style={styles.recordDetails}>
                    <Text style={styles.studentName}>{record.studentLabel}</Text>
                    <Text style={styles.timestamp}>
                      {new Date(record.timestamp).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      ·{' '}
                      {new Date(record.timestamp).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      {record.bouncedFromPickId ? ' · Bounced question' : ''}
                    </Text>
                  </View>
                  <View style={[styles.outcomePill, { backgroundColor: outcome.pale }]}>
                    <Text style={[styles.outcomeText, { color: outcome.colour }]}>{outcome.label}</Text>
                  </View>
                </View>
              );
            })}
          </Card>
          <Text style={styles.retentionNote}>
            Only privacy-safe labels are shown. You can clear this history whenever it is no longer needed.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function SummaryCard({ value, label, colour, pale }: { value: number; label: string; colour: string; pale: string }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: pale }]}>
      <Text style={[styles.summaryValue, { color: colour }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    borderRadius: radius.medium,
    minHeight: 100,
    padding: 15,
    width: '48%',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  summaryLabel: {
    color: colours.ink,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colours.ink,
    fontSize: 19,
    fontWeight: '700',
  },
  historyCard: {
    padding: 0,
  },
  historyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 70,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  historyBorder: {
    borderTopColor: colours.border,
    borderTopWidth: 1,
  },
  avatarBox: {
    alignItems: 'center',
    backgroundColor: colours.purplePale,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatar: {
    fontSize: 23,
  },
  recordDetails: {
    flex: 1,
    marginLeft: 11,
  },
  studentName: {
    color: colours.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  timestamp: {
    color: colours.inkMuted,
    fontSize: 10,
    marginTop: 3,
  },
  outcomePill: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  outcomeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  retentionNote: {
    color: colours.inkMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
});
