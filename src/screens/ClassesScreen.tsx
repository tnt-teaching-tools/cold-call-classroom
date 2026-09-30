import { confirmAction } from '../confirm';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { parseSafeRoster, validateStudentInput, type StudentInput } from '../domain/students';
import { colours, radius } from '../theme';
import type { ClassRoster } from '../types';

interface ClassesScreenProps {
  classes: ClassRoster[];
  activeClassId?: string;
  onSetActiveClass: (classId: string) => void;
  onCreateClass: (name: string) => void;
  onDeleteClass: (classId: string) => void;
  onAddStudent: (classId: string, student: StudentInput) => void;
  onAddStudents: (classId: string, students: StudentInput[]) => void;
  onDeleteStudent: (classId: string, studentId: string) => void;
  onToggleAbsent: (classId: string, studentId: string) => void;
  onResetAllPresent: (classId: string) => void;
  onToggleSupportFirst: (classId: string, studentId: string) => void;
  onAddDemoClass: () => void;
}

export function ClassesScreen({
  classes,
  activeClassId,
  onSetActiveClass,
  onCreateClass,
  onDeleteClass,
  onAddStudent,
  onAddStudents,
  onDeleteStudent,
  onToggleAbsent,
  onResetAllPresent,
  onToggleSupportFirst,
  onAddDemoClass,
}: ClassesScreenProps) {
  const [showNewClass, setShowNewClass] = useState(false);
  const [showNewStudent, setShowNewStudent] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [className, setClassName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastInitial, setLastInitial] = useState('');
  const [rosterText, setRosterText] = useState('');
  const [formError, setFormError] = useState('');

  const activeClass = useMemo(
    () => classes.find((item) => item.id === activeClassId) ?? classes[0],
    [classes, activeClassId],
  );

  const submitClass = () => {
    const name = className.trim();
    if (!name) {
      setFormError('Enter a class name.');
      return;
    }
    onCreateClass(name);
    setClassName('');
    setFormError('');
    setShowNewClass(false);
  };

  const submitStudent = () => {
    if (!activeClass) return;
    const validation = validateStudentInput(firstName, lastInitial);
    if (!validation.valid || !validation.firstName || !validation.lastInitial) {
      setFormError(validation.error ?? 'Check the student details.');
      return;
    }
    onAddStudent(activeClass.id, {
      firstName: validation.firstName,
      lastInitial: validation.lastInitial,
    });
    setFirstName('');
    setLastInitial('');
    setFormError('');
    setShowNewStudent(false);
  };

  const submitImport = () => {
    if (!activeClass) return;
    const parsed = parseSafeRoster(rosterText);
    if (parsed.invalid.length > 0) {
      const sample = parsed.invalid
        .slice(0, 3)
        .map((entry) => `• ${entry.line}: ${entry.reason}`)
        .join('\n');
      setFormError(`Fix ${parsed.invalid.length} unsafe or invalid entr${parsed.invalid.length === 1 ? 'y' : 'ies'}:\n${sample}`);
      return;
    }
    if (parsed.valid.length === 0) {
      setFormError('Add at least one student using “First, L”.');
      return;
    }
    onAddStudents(activeClass.id, parsed.valid);
    setRosterText('');
    setFormError('');
    setShowImport(false);
  };

  const confirmDeleteClass = (classItem: ClassRoster) => {
    confirmAction(`Delete ${classItem.name}?`, 'This removes its shortened roster and participation history from this browser.', () => onDeleteClass(classItem.id));
  };
  const confirmDeleteStudent = (studentId: string, label: string) => {
    if (!activeClass) return;
    confirmAction(`Remove ${label}?`, 'Their participation history will also be removed.', () => onDeleteStudent(activeClass.id, studentId));
  };

  const closeModal = (setter: (value: boolean) => void) => {
    setFormError('');
    setter(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader
        eyebrow="Private class setup"
        title="Your classes"
        subtitle="Only first names and one surname initial can be stored."
      />

      {classes.length === 0 ? (
        <Card>
          <EmptyState
            emoji="👋"
            title="Create your first class"
            message="Add a class manually or explore the picker with a fictional demonstration roster."
            actionLabel="Create a class"
            onAction={() => setShowNewClass(true)}
          />
          <Button variant="ghost" onPress={onAddDemoClass}>
            Try a demo class
          </Button>
        </Card>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.classChips}
          >
            {classes.map((classItem) => {
              const active = classItem.id === activeClass?.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={classItem.id}
                  onLongPress={() => confirmDeleteClass(classItem)}
                  onPress={() => onSetActiveClass(classItem.id)}
                  style={[styles.classChip, active && styles.activeClassChip]}
                >
                  <Text style={[styles.classChipText, active && styles.activeClassChipText]}>
                    {classItem.name}
                  </Text>
                  <Text style={[styles.classCount, active && styles.activeClassCount]}>
                    {classItem.students.length}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable style={styles.addClassChip} onPress={() => setShowNewClass(true)}>
              <Text style={styles.addClassText}>＋ Add class</Text>
            </Pressable>
          </ScrollView>

          {activeClass ? (
            <>
              <View style={styles.sectionRow}>
                <View>
                  <Text style={styles.sectionTitle}>{activeClass.name}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {activeClass.students.filter((student) => !student.absent).length} present ·{' '}
                    {activeClass.students.filter((student) => student.absent).length} absent
                  </Text>
                </View>
                <Button compact variant="ghost" onPress={() => confirmDeleteClass(activeClass)}>
                  Delete
                </Button>
              </View>

              <Card style={styles.attendanceCard}>
                <View style={styles.attendanceCopy}>
                  <Text style={styles.settingLead}>Everyone starts as present</Text>
                  <Text style={styles.studentPrivacy}>Only mark students who are absent for this lesson.</Text>
                </View>
                <Button compact variant="ghost" onPress={() => onResetAllPresent(activeClass.id)}>
                  Reset all present
                </Button>
              </Card>

              <View style={styles.actionRow}>
                <Button compact style={styles.flexButton} onPress={() => setShowNewStudent(true)}>
                  ＋ Add student
                </Button>
                <Button
                  compact
                  style={styles.flexButton}
                  variant="secondary"
                  onPress={() => setShowImport(true)}
                >
                  Paste safe list
                </Button>
              </View>

              {activeClass.students.length === 0 ? (
                <Card>
                  <EmptyState
                    emoji="🪪"
                    title="No students yet"
                    message="Add only a first name and one surname initial for each student."
                    actionLabel="Add a student"
                    onAction={() => setShowNewStudent(true)}
                  />
                </Card>
              ) : (
                <View style={styles.rosterList}>
                  {activeClass.students.map((student) => {
                    const label = `${student.firstName} ${student.lastInitial}.`;
                    return (
                      <Card key={student.id} style={styles.studentCard}>
                        <View style={[styles.avatar, { backgroundColor: `${student.accent}20` }]}>
                          <Text style={styles.avatarText}>{student.avatar}</Text>
                        </View>
                        <View style={styles.studentDetails}>
                          <Text style={[styles.studentName, student.absent && styles.absentName]}>
                            {label}
                          </Text>
                          <Text style={styles.studentPrivacy}>
                            {student.supportFirst ? 'Rehearse first · privacy-safe' : 'Present by default'}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => onToggleSupportFirst(activeClass.id, student.id)}
                          >
                            <Text style={[styles.supportLink, student.supportFirst && styles.supportLinkActive]}>
                              {student.supportFirst ? '🤝 Rehearse first on' : 'Add rehearsal support'}
                            </Text>
                          </Pressable>
                        </View>
                        <View style={styles.switchGroup}>
                          <Text style={styles.switchLabel}>{student.absent ? 'Absent' : 'Present'}</Text>
                          <Switch
                            accessibilityLabel={`Mark ${label} absent`}
                            onValueChange={() => onToggleAbsent(activeClass.id, student.id)}
                            value={student.absent}
                            trackColor={{ false: colours.mintPale, true: colours.coralPale }}
                            thumbColor={student.absent ? colours.coral : colours.mint}
                          />
                        </View>
                        <Pressable
                          accessibilityLabel={`Remove ${label}`}
                          accessibilityRole="button"
                          hitSlop={12}
                          onPress={() => confirmDeleteStudent(student.id, label)}
                          style={styles.removeButton}
                        >
                          <Text style={styles.removeText}>×</Text>
                        </Pressable>
                      </Card>
                    );
                  })}
                </View>
              )}
            </>
          ) : null}
        </>
      )}

      <Modal animationType="slide" transparent visible={showNewClass} onRequestClose={() => closeModal(setShowNewClass)}>
        <ModalFrame title="Create a class" onClose={() => closeModal(setShowNewClass)}>
          <Text style={styles.fieldLabel}>Class name</Text>
          <TextInput
            autoCapitalize="words"
            autoFocus
            maxLength={40}
            onChangeText={setClassName}
            onSubmitEditing={submitClass}
            placeholder="e.g. Year 9 Science"
            placeholderTextColor="#9AA3B2"
            style={styles.input}
            value={className}
          />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Button onPress={submitClass}>Create class</Button>
        </ModalFrame>
      </Modal>

      <Modal animationType="slide" transparent visible={showNewStudent} onRequestClose={() => closeModal(setShowNewStudent)}>
        <ModalFrame title="Add a student" onClose={() => closeModal(setShowNewStudent)}>
          <View style={styles.privacyNotice}>
            <Text style={styles.privacyNoticeTitle}>🔒 Full surnames are blocked</Text>
            <Text style={styles.privacyNoticeText}>The app stores only a first name and one initial.</Text>
          </View>
          <Text style={styles.fieldLabel}>First name</Text>
          <TextInput
            autoCapitalize="words"
            autoFocus
            maxLength={30}
            onChangeText={setFirstName}
            placeholder="Sophie"
            placeholderTextColor="#9AA3B2"
            style={styles.input}
            value={firstName}
          />
          <Text style={styles.fieldLabel}>Surname initial</Text>
          <TextInput
            autoCapitalize="characters"
            maxLength={2}
            onChangeText={setLastInitial}
            onSubmitEditing={submitStudent}
            placeholder="T"
            placeholderTextColor="#9AA3B2"
            style={[styles.input, styles.initialInput]}
            value={lastInitial}
          />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Button onPress={submitStudent}>Add student</Button>
        </ModalFrame>
      </Modal>

      <Modal animationType="slide" transparent visible={showImport} onRequestClose={() => closeModal(setShowImport)}>
        <ModalFrame title="Paste a safe class list" onClose={() => closeModal(setShowImport)}>
          <View style={styles.privacyNotice}>
            <Text style={styles.privacyNoticeTitle}>Use one student per line</Text>
            <Text style={styles.privacyNoticeText}>Accepted: “Sophie, T” or “Sophie T.” Full surnames are rejected.</Text>
          </View>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            multiline
            onChangeText={setRosterText}
            placeholder={'Sophie, T\nAria, M\nTama, R'}
            placeholderTextColor="#9AA3B2"
            style={[styles.input, styles.rosterInput]}
            textAlignVertical="top"
            value={rosterText}
          />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Button onPress={submitImport}>Import safe list</Button>
        </ModalFrame>
      </Modal>
    </ScrollView>
  );
}

function ModalFrame({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.modalBackdrop}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>
        </View>
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  classChips: {
    gap: 10,
    paddingBottom: 18,
  },
  classChip: {
    alignItems: 'center',
    backgroundColor: colours.white,
    borderColor: colours.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 15,
  },
  activeClassChip: {
    backgroundColor: colours.ink,
    borderColor: colours.ink,
  },
  classChipText: {
    color: colours.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  activeClassChipText: {
    color: colours.white,
  },
  classCount: {
    backgroundColor: colours.purplePale,
    borderRadius: radius.pill,
    color: colours.purpleDark,
    fontSize: 12,
    fontWeight: '900',
    minWidth: 24,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    textAlign: 'center',
  },
  activeClassCount: {
    backgroundColor: colours.white,
  },
  addClassChip: {
    alignItems: 'center',
    borderColor: colours.purple,
    borderRadius: radius.medium,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  addClassText: {
    color: colours.purpleDark,
    fontSize: 14,
    fontWeight: '900',
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  attendanceCard: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 14,
  },
  attendanceCopy: {
    flex: 1,
    marginRight: 10,
  },
  settingLead: {
    color: colours.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  sectionTitle: {
    color: colours.ink,
    fontSize: 23,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: colours.inkMuted,
    fontSize: 13,
    marginTop: 3,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  flexButton: {
    flex: 1,
  },
  rosterList: {
    gap: 10,
  },
  studentCard: {
    alignItems: 'center',
    borderRadius: radius.medium,
    flexDirection: 'row',
    padding: 12,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 15,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    fontSize: 24,
  },
  studentDetails: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    color: colours.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  absentName: {
    color: colours.inkMuted,
    textDecorationLine: 'line-through',
  },
  studentPrivacy: {
    color: colours.inkMuted,
    fontSize: 11,
    marginTop: 3,
  },
  supportLink: {
    color: colours.purple,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 5,
  },
  supportLinkActive: {
    color: '#167A55',
  },
  switchGroup: {
    alignItems: 'center',
  },
  switchLabel: {
    color: colours.inkMuted,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 1,
  },
  removeButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    marginLeft: 6,
    width: 34,
  },
  removeText: {
    color: colours.inkMuted,
    fontSize: 27,
    fontWeight: '400',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(23, 37, 84, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colours.canvas,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '92%',
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    color: colours.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colours.white,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  closeButtonText: {
    color: colours.ink,
    fontSize: 29,
    lineHeight: 32,
  },
  fieldLabel: {
    color: colours.ink,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 7,
  },
  input: {
    backgroundColor: colours.white,
    borderColor: colours.border,
    borderRadius: radius.medium,
    borderWidth: 1.5,
    color: colours.ink,
    fontSize: 17,
    marginBottom: 16,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  initialInput: {
    fontSize: 22,
    fontWeight: '900',
    maxWidth: 100,
    textAlign: 'center',
  },
  rosterInput: {
    minHeight: 180,
  },
  privacyNotice: {
    backgroundColor: colours.cyanPale,
    borderRadius: radius.medium,
    marginBottom: 18,
    padding: 14,
  },
  privacyNoticeTitle: {
    color: colours.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  privacyNoticeText: {
    color: colours.inkMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  error: {
    color: colours.danger,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 14,
  },
});
