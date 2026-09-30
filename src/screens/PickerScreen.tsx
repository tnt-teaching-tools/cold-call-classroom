import { useEffect, useMemo, useState } from 'react';
import { useWindowDimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { roundProgress } from '../domain/selection';
import { colours, radius } from '../theme';
import type { ClassRoster, Outcome, PickRecord, QuestionRoutine, RoundState, SelectionMode } from '../types';

interface PickerScreenProps {
  classes: ClassRoster[];
  activeClass?: ClassRoster;
  roundState?: RoundState;
  history: PickRecord[];
  waitSeconds: number;
  pairSeconds: number;
  checkSeconds: number;
  postAnswerSeconds: number;
  selectionMode: SelectionMode;
  questionRoutine: QuestionRoutine;
  showProgressToClass: boolean;
  onSetActiveClass: (classId: string) => void;
  onGoToClasses: () => void;
  onPick: (bouncedFromPickId?: string) => void;
  onSetOutcome: (pickId: string, outcome: Outcome) => void;
  onReturnToStudent: (record: PickRecord) => void;
}

const outcomeOptions: Array<{ key: Outcome; label: string; emoji: string; colour: string; pale: string }> = [
  { key: 'correct', label: 'Correct', emoji: '✓', colour: colours.mint, pale: colours.mintPale },
  { key: 'partial', label: 'Partial', emoji: '◐', colour: '#D98B00', pale: colours.yellowPale },
  { key: 'not_yet', label: 'Not yet', emoji: '↻', colour: colours.coral, pale: colours.coralPale },
];

export function PickerScreen({
  classes,
  activeClass,
  roundState,
  history,
  waitSeconds,
  pairSeconds,
  checkSeconds,
  postAnswerSeconds,
  selectionMode,
  questionRoutine,
  showProgressToClass,
  onSetActiveClass,
  onGoToClasses,
  onPick,
  onSetOutcome,
  onReturnToStudent,
}: PickerScreenProps) {
  const wide = useWindowDimensions().width >= 860;
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerPhase, setTimerPhase] = useState<'think' | 'pair' | 'check' | null>(null);
  const [activePrompt, setActivePrompt] = useState('');
  const [postAnswerCountdown, setPostAnswerCountdown] = useState<number | null>(null);
  const [bouncedFromPickId, setBouncedFromPickId] = useState<string | undefined>();
  const [projectorMode, setProjectorMode] = useState(false);

  const presentStudents = activeClass?.students.filter(
    (student) => !student.absent && (!student.supportFirst || questionRoutine !== 'cold_call'),
  ) ?? [];
  const classHistory = useMemo(
    () => history.filter((record) => record.classId === activeClass?.id),
    [history, activeClass?.id],
  );
  const latestPick = classHistory[0];
  const progress = roundProgress(roundState, presentStudents.length);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      if (timerPhase === 'think' && questionRoutine === 'think_pair_share') {
        setTimerPhase('pair');
        setCountdown(pairSeconds);
        return;
      }
      onPick(bouncedFromPickId);
      setBouncedFromPickId(undefined);
      setCountdown(null);
      setTimerPhase(null);
      setActivePrompt('');
      return;
    }
    const timer = setTimeout(() => setCountdown((value) => (value === null ? null : value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, bouncedFromPickId, onPick, pairSeconds, questionRoutine, timerPhase]);

  useEffect(() => {
    if (postAnswerCountdown === null) return;
    if (postAnswerCountdown <= 0) {
      setPostAnswerCountdown(null);
      return;
    }
    const timer = setTimeout(() => setPostAnswerCountdown((value) => (value === null ? null : value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [postAnswerCountdown]);

  const startColdCall = (bounceFrom?: string) => {
    if (presentStudents.length === 0) return;
    if (!bounceFrom) setActivePrompt('');
    setBouncedFromPickId(bounceFrom);
    const seconds = questionRoutine === 'check_everyone' ? checkSeconds : waitSeconds;
    setTimerPhase(questionRoutine === 'check_everyone' ? 'check' : 'think');
    if (seconds === 0) {
      onPick(bounceFrom);
      setTimerPhase(null);
      return;
    }
    setCountdown(seconds);
  };

  const startDifferentStudentFollowUp = (prompt: string) => {
    if (!latestPick) return;
    setActivePrompt(prompt);
    setBouncedFromPickId(latestPick.id);
    setTimerPhase('think');
    setCountdown(waitSeconds || 1);
  };

  const startSameStudentFollowUp = (prompt: string) => {
    if (!latestPick) return;
    setActivePrompt(prompt);
    onReturnToStudent(latestPick);
  };

  const markOutcome = (outcome: Outcome) => {
    if (!latestPick) return;
    onSetOutcome(latestPick.id, outcome);
    if (postAnswerSeconds > 0) setPostAnswerCountdown(postAnswerSeconds);
  };

  const revealNow = () => {
    onPick(bouncedFromPickId);
    setBouncedFromPickId(undefined);
    setCountdown(null);
    setTimerPhase(null);
    setActivePrompt('');
  };

  if (projectorMode) {
    return (
      <View style={styles.projector}>
        <View style={styles.projectorBlobOne} />
        <View style={styles.projectorBlobTwo} />
        <Pressable
          accessibilityLabel="Exit projector view"
          accessibilityRole="button"
          onPress={() => setProjectorMode(false)}
          style={styles.exitProjector}
        >
          <Text style={styles.exitProjectorText}>Exit teacher view</Text>
        </Pressable>
        <Text style={styles.projectorBrand}>COLD CALL CLASSROOM</Text>
        {countdown !== null ? (
          <View style={styles.projectorNameGroup}>
            <Text style={styles.projectorAvatar}>{timerPhase === 'pair' ? '🗣️' : timerPhase === 'check' ? '✍️' : '💭'}</Text>
            <Text adjustsFontSizeToFit numberOfLines={2} style={styles.projectorQuestion}>
              {activePrompt || String(countdown)}
            </Text>
            <Text style={styles.projectorPrompt}>
              {timerPhase === 'pair' ? `Pair and rehearse · ${countdown}` : timerPhase === 'check' ? `Everyone responds · ${countdown}` : `Everyone prepares an answer · ${countdown}`}
            </Text>
          </View>
        ) : latestPick ? (
          <View style={styles.projectorNameGroup}>
            <Text style={styles.projectorAvatar}>{latestPick.studentAvatar}</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.projectorName}>
              {latestPick.studentLabel}
            </Text>
            <Text style={styles.projectorPrompt}>We’re listening to your thinking</Text>
          </View>
        ) : (
          <View style={styles.projectorNameGroup}>
            <Text style={styles.projectorAvatar}>💭</Text>
            <Text style={styles.projectorName}>Thinking time</Text>
            <Text style={styles.projectorPrompt}>Everyone prepares an answer</Text>
          </View>
        )}
        {showProgressToClass && selectionMode !== 'random' ? (
          <View style={styles.projectorProgress}>
            <ProgressBar
              label={`Round ${progress.round}: ${progress.picked} of ${progress.eligible} voices heard`}
              percentage={progress.percentage}
            />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow="CLASSROOM WORKSPACE"
        title="Live questioning"
        subtitle="A fair way to bring every student into the conversation."
      />

      {classes.length === 0 ? (
        <Card>
          <EmptyState
            emoji="🎯"
            title="Add a class to begin"
            message="Create a privacy-safe roster using first names and surname initials only."
            actionLabel="Set up a class"
            onAction={onGoToClasses}
          />
        </Card>
      ) : (
        <View style={[styles.workspace, wide && styles.workspaceWide]}>
          <View style={[styles.sidebar, wide && styles.sidebarWide]}>
          <Text style={styles.sidebarTitle}>ACTIVE CLASS</Text>
          <ScrollView
            horizontal={!wide}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.classChips, wide && { flexDirection: 'column' }]}
          >
            {classes.map((classItem) => {
              const active = classItem.id === activeClass?.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={classItem.id}
                  onPress={() => onSetActiveClass(classItem.id)}
                  style={[styles.classChip, active && styles.activeClassChip]}
                >
                  <Text style={[styles.classChipText, active && styles.activeClassChipText]}>
                    {classItem.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {selectionMode !== 'random' ? <Card style={styles.progressCard}>
            <View style={styles.roundRow}>
              <View>
                <Text style={styles.roundEyebrow}>FAIR COVERAGE</Text>
                <Text style={styles.roundTitle}>Round {progress.round}</Text>
              </View>
              <View style={styles.presentPill}>
                <Text style={styles.presentPillText}>{presentStudents.length} present</Text>
              </View>
            </View>
            <ProgressBar
              label={`${progress.picked} of ${progress.eligible} students called`}
              percentage={progress.percentage}
            />
            <Text style={styles.progressHint}>{selectionMode === 'mixed' ? 'Whole-class coverage with occasional revisits to keep everyone thinking.' : 'No student repeats until every present student has been selected.'}</Text>
          </Card> : null}

          <View style={[styles.routineGuide, !wide && { display: 'none' }]}>
            <Text style={styles.sidebarTitle}>THE ROUTINE</Text>
            <Text style={styles.guideStep}>01  Ask the question</Text>
            <Text style={styles.guideCopy}>Give everyone something to think about.</Text>
            <Text style={styles.guideStep}>02  Give thinking time</Text>
            <Text style={styles.guideCopy}>{waitSeconds} seconds before a name is revealed.</Text>
            <Text style={styles.guideStep}>03  Invite a response</Text>
            <Text style={styles.guideCopy}>Listen, probe and build on their thinking.</Text>
          </View>
          </View>
          <View style={styles.stage}>
          <Card style={[styles.pickerCard, !latestPick && countdown === null && styles.readyCard]}>
            {countdown !== null ? (
              <View style={styles.thinkingState}>
                <Text style={styles.thinkingEmoji}>💭</Text>
                {activePrompt ? <Text style={styles.followUpPrompt}>{activePrompt}</Text> : null}
                <Text style={styles.thinkingLabel}>{timerPhase === 'pair' ? 'Pair and rehearse' : timerPhase === 'check' ? 'Everyone responds' : 'Everyone think'}</Text>
                <Text style={styles.countdown}>{countdown}</Text>
                <Text style={styles.thinkingHint}>Prepare an answer before a name is revealed.</Text>
                <Button variant="secondary" onPress={revealNow} style={styles.revealButton}>
                  Reveal now
                </Button>
              </View>
            ) : latestPick ? (
              <View style={styles.selectedState}>
                <Text style={styles.selectedEyebrow}>LISTENING TO</Text>
                <View style={styles.selectedAvatar}>
                  <Text style={styles.selectedAvatarText}>{latestPick.studentAvatar}</Text>
                </View>
                <Text adjustsFontSizeToFit numberOfLines={1} style={styles.selectedName}>
                  {latestPick.studentLabel}
                </Text>
                <Text style={styles.selectedPrompt}>{activePrompt || 'Share your thinking when you’re ready.'}</Text>

                <View style={styles.outcomeLabelRow}>
                  <Text style={styles.outcomeLabel}>Private teacher note</Text>
                  <Text style={styles.privateTag}>Not projected</Text>
                </View>
                <View style={styles.outcomes}>
                  {outcomeOptions.map((option) => {
                    const selected = latestPick.outcome === option.key;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={option.key}
                  onPress={() => markOutcome(option.key)}
                        style={[
                          styles.outcomeButton,
                          { backgroundColor: option.pale, borderColor: selected ? option.colour : 'transparent' },
                        ]}
                      >
                        <Text style={[styles.outcomeIcon, { color: option.colour }]}>{option.emoji}</Text>
                        <Text style={[styles.outcomeText, { color: option.colour }]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {postAnswerCountdown !== null ? (
                  <View style={styles.pauseBanner}>
                    <Text style={styles.pauseText}>Pause before evaluating · {postAnswerCountdown}</Text>
                  </View>
                ) : null}
                {latestPick.outcome !== 'unmarked' ? (
                  <View style={styles.followUpSection}>
                    <Text style={styles.followUpTitle}>Choose what happens next</Text>
                    <Text style={styles.followUpHelp}>The prompt appears immediately. Options involving another student automatically begin whole-class thinking time.</Text>
                    <Button variant="ghost" onPress={() => startSameStudentFollowUp('What makes you think that?')}>
                      Ask for a reason · same student
                    </Button>
                    <Button variant="ghost" onPress={() => startSameStudentFollowUp('What evidence supports your answer?')}>
                      Ask for evidence · same student
                    </Button>
                    <Button variant="ghost" onPress={() => startSameStudentFollowUp('Can you say that again using precise subject vocabulary?')}>
                      Improve the wording · same student
                    </Button>
                    <Button variant="secondary" onPress={() => startDifferentStudentFollowUp('Who can respond to or improve this answer?')}>
                      Pass it on · new student
                    </Button>
                    <Button variant="secondary" onPress={() => startDifferentStudentFollowUp('What can you add to this answer?')}>
                      Add to the answer · new student
                    </Button>
                    {latestPick.outcome === 'not_yet' ? (
                      <View style={styles.noOptOutBox}>
                        <Text style={styles.noOptOutTitle}>No Opt Out</Text>
                        <Text style={styles.followUpHelp}>Offer support, then return to the original student.</Text>
                        <Button variant="ghost" onPress={() => startSameStudentFollowUp('Here is a hint. Now try the question again.')}>Give a hint and return</Button>
                        <Button variant="ghost" onPress={() => startSameStudentFollowUp('Rehearse with a partner, then I will return to you.')}>Partner rehearsal and return</Button>
                        <Button variant="ghost" onPress={() => startSameStudentFollowUp('Use this example to help. Now try again.')}>Show an example and return</Button>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.readyState}>
                <Text style={styles.readyEyebrow}>READY WHEN YOU ARE</Text>
                <Text style={styles.readyTitle}>{'Make room for\nevery voice.'}</Text>
                <Text style={styles.readyMessage}>Ask your question, then start the timer. A student will be selected after everyone has had time to think.</Text>
              </View>
            )}
          <Button
            disabled={presentStudents.length === 0 || countdown !== null}
            onPress={() => startColdCall()}
            style={styles.mainAction}
          >
            {latestPick ? `Next cold call · ${waitSeconds}s think` : `Start cold calling · ${waitSeconds}s think`}
          </Button>
          </Card>

          {presentStudents.length === 0 ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>No students are marked present</Text>
              <Text style={styles.warningText}>Update attendance in Classes before beginning.</Text>
            </View>
          ) : null}



          {latestPick && countdown === null ? (
            <View style={styles.secondaryActions}>
              <Button
                compact
                style={styles.secondaryButton}
                variant="ghost"
                onPress={() => setProjectorMode(true)}
              >
                ◫ Project
              </Button>
            </View>
          ) : null}

          {classHistory.length > 1 ? (
            <View style={styles.recentSection}>
              <Text style={styles.recentTitle}>Recent cold calls</Text>
              {classHistory.slice(1, 5).map((record) => (
                <View key={record.id} style={styles.recentRow}>
                  <Text style={styles.recentAvatar}>{record.studentAvatar}</Text>
                  <Text style={styles.recentName}>{record.studentLabel}</Text>
                  <OutcomePill outcome={record.outcome} />
                </View>
              ))}
            </View>
          ) : null}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function OutcomePill({ outcome }: { outcome: Outcome }) {
  const option = outcomeOptions.find((item) => item.key === outcome);
  if (!option) return <Text style={styles.unmarkedPill}>Unmarked</Text>;
  return (
    <View style={[styles.outcomePill, { backgroundColor: option.pale }]}>
      <Text style={[styles.outcomePillText, { color: option.colour }]}>{option.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 28,
    paddingBottom: 40,
  },
  classChips: {
    gap: 9,
    paddingBottom: 16,
  },
  workspace: { gap: 24 },
  workspaceWide: { flexDirection: 'row', alignItems: 'flex-start' },
  sidebar: { padding: 20, backgroundColor: colours.white, borderColor: colours.border, borderWidth: 1, borderRadius: 12 },
  sidebarWide: { width: 280 },
  stage: { flex: 1, minWidth: 0 },
  sidebarTitle: { fontSize: 10, letterSpacing: 1.6, fontWeight: '700', color: colours.inkMuted, marginBottom: 12 },
  routineGuide: { borderTopWidth: 1, borderTopColor: colours.border, paddingTop: 20, marginTop: 8 },
  guideStep: { fontSize: 13, fontWeight: '600', color: colours.ink, marginTop: 12 },
  guideCopy: { fontSize: 12, lineHeight: 18, color: colours.inkMuted, marginTop: 4 },
  readyCard: { backgroundColor: '#252722', borderColor: '#252722', padding: 28 },
  readyEyebrow: { color: '#EBC35B', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 20 },
  classChip: {
    backgroundColor: colours.white,
    borderColor: colours.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 43,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  activeClassChip: {
    backgroundColor: colours.ink,
    borderColor: colours.ink,
  },
  classChipText: {
    color: colours.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  activeClassChipText: {
    color: colours.white,
  },
  progressCard: {
    marginBottom: 15,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    padding: 0,
  },
  roundRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  roundEyebrow: {
    color: colours.purple,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  roundTitle: {
    color: colours.ink,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  presentPill: {
    backgroundColor: colours.mintPale,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  presentPillText: {
    color: '#167A55',
    fontSize: 12,
    fontWeight: '700',
  },
  progressHint: {
    color: colours.inkMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  pickerCard: {
    minHeight: 310,
    overflow: 'hidden',
  },
  readyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 250,
    paddingHorizontal: 20,
  },
  readyEmoji: {
    fontSize: 64,
  },
  readyTitle: {
    color: '#FAFAF5',
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1,
    fontWeight: '700',
    marginTop: 0,
    textAlign: 'center',
  },
  readyMessage: {
    color: '#D0D1C9',
    maxWidth: 430,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  thinkingState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
    paddingHorizontal: 20,
  },
  thinkingEmoji: {
    fontSize: 48,
  },
  thinkingLabel: {
    color: colours.purpleDark,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  followUpPrompt: {
    color: colours.ink,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 27,
    marginBottom: 10,
    textAlign: 'center',
  },
  countdown: {
    color: colours.ink,
    fontSize: 92,
    fontWeight: '700',
    lineHeight: 108,
  },
  thinkingHint: {
    color: colours.inkMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  revealButton: {
    marginTop: 18,
    minWidth: 170,
  },
  selectedState: {
    alignItems: 'center',
    minHeight: 310,
    paddingTop: 6,
  },
  selectedEyebrow: {
    color: colours.purple,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
  },
  selectedAvatar: {
    alignItems: 'center',
    backgroundColor: colours.purplePale,
    borderRadius: 34,
    height: 78,
    justifyContent: 'center',
    marginTop: 12,
    width: 78,
  },
  selectedAvatarText: {
    fontSize: 42,
  },
  selectedName: {
    color: colours.ink,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1.3,
    marginTop: 10,
    maxWidth: '100%',
    textAlign: 'center',
  },
  selectedPrompt: {
    color: colours.inkMuted,
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  outcomeLabelRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  outcomeLabel: {
    color: colours.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  privateTag: {
    color: colours.inkMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  outcomes: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  pauseBanner: {
    backgroundColor: colours.cyanPale,
    borderRadius: radius.medium,
    marginTop: 14,
    padding: 12,
  },
  pauseText: {
    color: colours.ink,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  followUpSection: {
    gap: 8,
    marginTop: 18,
    width: '100%',
  },
  followUpTitle: {
    color: colours.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  followUpHelp: {
    color: colours.inkMuted,
    fontSize: 11,
    lineHeight: 17,
  },
  noOptOutBox: {
    backgroundColor: colours.yellowPale,
    borderRadius: radius.medium,
    gap: 7,
    marginTop: 8,
    padding: 12,
  },
  noOptOutTitle: {
    color: colours.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  outcomeButton: {
    alignItems: 'center',
    borderRadius: radius.medium,
    borderWidth: 2,
    flex: 1,
    minHeight: 64,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  outcomeIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  warningBox: {
    backgroundColor: colours.coralPale,
    borderRadius: radius.medium,
    marginTop: 14,
    padding: 14,
  },
  warningTitle: {
    color: colours.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  warningText: {
    color: colours.danger,
    fontSize: 12,
    marginTop: 3,
  },
  mainAction: {
    marginTop: 15,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
  },
  recentSection: {
    marginTop: 25,
  },
  recentTitle: {
    color: colours.ink,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  recentRow: {
    alignItems: 'center',
    backgroundColor: colours.white,
    borderBottomColor: colours.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: 12,
  },
  recentAvatar: {
    fontSize: 21,
    marginRight: 10,
  },
  recentName: {
    color: colours.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  outcomePill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  outcomePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  unmarkedPill: {
    color: colours.inkMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  projector: {
    alignItems: 'center',
    backgroundColor: colours.canvas,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 32,
  },
  projectorBlobOne: {
    backgroundColor: colours.purplePale,
    borderRadius: 180,
    height: 300,
    left: -100,
    position: 'absolute',
    top: -90,
    width: 300,
  },
  projectorBlobTwo: {
    backgroundColor: colours.cyanPale,
    borderRadius: 160,
    bottom: -110,
    height: 280,
    position: 'absolute',
    right: -80,
    width: 280,
  },
  exitProjector: {
    backgroundColor: colours.white,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    position: 'absolute',
    right: 20,
    top: 18,
  },
  exitProjectorText: {
    color: colours.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  projectorBrand: {
    color: colours.purple,
    fontSize: 14,
    fontWeight: '700',
    left: 24,
    letterSpacing: 1.7,
    position: 'absolute',
    top: 26,
  },
  projectorNameGroup: {
    alignItems: 'center',
    width: '100%',
  },
  projectorAvatar: {
    fontSize: 84,
  },
  projectorName: {
    color: colours.ink,
    fontSize: 76,
    fontWeight: '700',
    letterSpacing: -2,
    marginTop: 12,
    maxWidth: '100%',
    textAlign: 'center',
  },
  projectorQuestion: {
    color: colours.white,
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 50,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  projectorPrompt: {
    color: colours.inkMuted,
    fontSize: 21,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  projectorProgress: {
    bottom: 30,
    left: 30,
    position: 'absolute',
    right: 30,
  },
});
