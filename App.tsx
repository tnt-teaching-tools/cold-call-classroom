import { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

import { TabBar } from './src/components/TabBar';
import { makeId } from './src/domain/ids';
import { EMPTY_ROUND_STATE, nextFairPick, nextMixedPick, nextRandomPick } from './src/domain/selection';
import { createStudent, formatStudentLabel, type StudentInput } from './src/domain/students';
import { ClassesScreen } from './src/screens/ClassesScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { PickerScreen } from './src/screens/PickerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { clearAppData, loadAppData, saveAppData } from './src/storage';
import { colours, radius } from './src/theme';
import {
  EMPTY_APP_DATA,
  type AppData,
  type AppSettings,
  type ClassRoster,
  type Outcome,
  type PickRecord,
  type TabKey,
} from './src/types';

const demoStudents: StudentInput[] = [
  { firstName: 'Aroha', lastInitial: 'M' },
  { firstName: 'Tama', lastInitial: 'R' },
  { firstName: 'Sophie', lastInitial: 'T' },
  { firstName: 'Aria', lastInitial: 'K' },
  { firstName: 'Noah', lastInitial: 'P' },
  { firstName: 'Luca', lastInitial: 'S' },
  { firstName: 'Mia', lastInitial: 'W' },
  { firstName: 'Zane', lastInitial: 'H' },
];

export default function App() {
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA);
  const [activeTab, setActiveTab] = useState<TabKey>('pick');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadAppData().then((saved) => {
      if (!mounted) return;
      setData(saved);
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      void saveAppData(data);
    }, 180);
    return () => clearTimeout(timer);
  }, [data, loaded]);

  const activeClass = useMemo(
    () => data.classes.find((classItem) => classItem.id === data.activeClassId) ?? data.classes[0],
    [data.classes, data.activeClassId],
  );

  const setActiveClass = useCallback((classId: string) => {
    setData((current) => ({ ...current, activeClassId: classId }));
  }, []);

  const createClass = useCallback((name: string) => {
    setData((current) => {
      const now = new Date().toISOString();
      const newClass: ClassRoster = {
        id: makeId('class'),
        name: name.trim(),
        students: [],
        createdAt: now,
        updatedAt: now,
      };
      return {
        ...current,
        classes: [...current.classes, newClass],
        activeClassId: newClass.id,
        roundStates: { ...current.roundStates, [newClass.id]: EMPTY_ROUND_STATE },
      };
    });
  }, []);

  const addDemoClass = useCallback(() => {
    setData((current) => {
      const now = new Date().toISOString();
      const newClass: ClassRoster = {
        id: makeId('class'),
        name: 'Demo Science Class',
        students: demoStudents.map((student, index) => createStudent(student, index)),
        createdAt: now,
        updatedAt: now,
      };
      return {
        ...current,
        classes: [...current.classes, newClass],
        activeClassId: newClass.id,
        roundStates: { ...current.roundStates, [newClass.id]: EMPTY_ROUND_STATE },
      };
    });
    setActiveTab('pick');
  }, []);

  const deleteClass = useCallback((classId: string) => {
    setData((current) => {
      const classes = current.classes.filter((classItem) => classItem.id !== classId);
      const roundStates = { ...current.roundStates };
      delete roundStates[classId];
      return {
        ...current,
        classes,
        activeClassId:
          current.activeClassId === classId ? classes[0]?.id : current.activeClassId,
        history: current.history.filter((record) => record.classId !== classId),
        roundStates,
      };
    });
  }, []);

  const addStudent = useCallback((classId: string, input: StudentInput) => {
    setData((current) => ({
      ...current,
      classes: current.classes.map((classItem) =>
        classItem.id === classId
          ? {
              ...classItem,
              students: [...classItem.students, createStudent(input, classItem.students.length)],
              updatedAt: new Date().toISOString(),
            }
          : classItem,
      ),
    }));
  }, []);

  const addStudents = useCallback((classId: string, inputs: StudentInput[]) => {
    setData((current) => ({
      ...current,
      classes: current.classes.map((classItem) =>
        classItem.id === classId
          ? {
              ...classItem,
              students: [
                ...classItem.students,
                ...inputs.map((input, index) => createStudent(input, classItem.students.length + index)),
              ],
              updatedAt: new Date().toISOString(),
            }
          : classItem,
      ),
    }));
  }, []);

  const deleteStudent = useCallback((classId: string, studentId: string) => {
    setData((current) => {
      const currentRound = current.roundStates[classId];
      return {
        ...current,
        classes: current.classes.map((classItem) =>
          classItem.id === classId
            ? {
                ...classItem,
                students: classItem.students.filter((student) => student.id !== studentId),
                updatedAt: new Date().toISOString(),
              }
            : classItem,
        ),
        history: current.history.filter((record) => record.studentId !== studentId),
        roundStates: currentRound
          ? {
              ...current.roundStates,
              [classId]: {
                ...currentRound,
                queue: currentRound.queue.filter((id) => id !== studentId),
                pickedThisRound: currentRound.pickedThisRound.filter((id) => id !== studentId),
                lastPickedId:
                  currentRound.lastPickedId === studentId ? undefined : currentRound.lastPickedId,
              },
            }
          : current.roundStates,
      };
    });
  }, []);

  const toggleAbsent = useCallback((classId: string, studentId: string) => {
    setData((current) => ({
      ...current,
      classes: current.classes.map((classItem) =>
        classItem.id === classId
          ? {
              ...classItem,
              students: classItem.students.map((student) =>
                student.id === studentId ? { ...student, absent: !student.absent } : student,
              ),
              updatedAt: new Date().toISOString(),
            }
          : classItem,
      ),
    }));
  }, []);

  const resetAllPresent = useCallback((classId: string) => {
    setData((current) => ({
      ...current,
      classes: current.classes.map((classItem) =>
        classItem.id === classId
          ? { ...classItem, students: classItem.students.map((student) => ({ ...student, absent: false })) }
          : classItem,
      ),
    }));
  }, []);

  const toggleSupportFirst = useCallback((classId: string, studentId: string) => {
    setData((current) => ({
      ...current,
      classes: current.classes.map((classItem) =>
        classItem.id === classId
          ? {
              ...classItem,
              students: classItem.students.map((student) =>
                student.id === studentId ? { ...student, supportFirst: !student.supportFirst } : student,
              ),
            }
          : classItem,
      ),
    }));
  }, []);

  const pickStudent = useCallback((bouncedFromPickId?: string) => {
    setData((current) => {
      const classItem =
        current.classes.find((item) => item.id === current.activeClassId) ?? current.classes[0];
      if (!classItem) return current;

      const presentIds = classItem.students
        .filter((student) => !student.absent && (!student.supportFirst || current.settings.questionRoutine !== 'cold_call'))
        .map((student) => student.id);
      const result = current.settings.selectionMode === 'random'
        ? nextRandomPick(current.roundStates[classItem.id], presentIds)
        : current.settings.selectionMode === 'mixed'
          ? nextMixedPick(current.roundStates[classItem.id], presentIds)
          : nextFairPick(current.roundStates[classItem.id], presentIds);
      if (!result.studentId) return current;
      const student = classItem.students.find((item) => item.id === result.studentId);
      if (!student) return current;

      const record: PickRecord = {
        id: makeId('pick'),
        classId: classItem.id,
        className: classItem.name,
        studentId: student.id,
        studentLabel: formatStudentLabel(student),
        studentAvatar: student.avatar,
        timestamp: new Date().toISOString(),
        outcome: 'unmarked',
        bouncedFromPickId,
      };

      return {
        ...current,
        activeClassId: classItem.id,
        roundStates: { ...current.roundStates, [classItem.id]: result.state },
        history: [record, ...current.history].slice(0, 2000),
      };
    });
  }, []);

  const returnToStudent = useCallback((record: PickRecord) => {
    const repeated: PickRecord = {
      ...record,
      id: makeId('pick'),
      timestamp: new Date().toISOString(),
      outcome: 'unmarked',
      bouncedFromPickId: record.id,
    };
    setData((current) => ({ ...current, history: [repeated, ...current.history].slice(0, 2000) }));
  }, []);

  const setOutcome = useCallback((pickId: string, outcome: Outcome) => {
    setData((current) => ({
      ...current,
      history: current.history.map((record) => (record.id === pickId ? { ...record, outcome } : record)),
    }));
  }, []);

  const clearHistory = useCallback((classId: string) => {
    setData((current) => ({
      ...current,
      history: current.history.filter((record) => record.classId !== classId),
    }));
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setData((current) => ({
      ...current,
      settings: { ...current.settings, ...updates },
    }));
  }, []);

  const deleteAllData = useCallback(() => {
    void clearAppData();
    setData({
      ...EMPTY_APP_DATA,
      settings: { ...EMPTY_APP_DATA.settings },
      roundStates: {},
      classes: [],
      history: [],
    });
    setActiveTab('pick');
  }, []);

  if (!loaded) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" backgroundColor={colours.canvas} />
        <Text style={styles.loadingIcon}>🎯</Text>
        <Text style={styles.loadingTitle}>Cold Call Classroom</Text>
        <Text style={styles.loadingText}>Preparing your private teacher workspace…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colours.canvas} />
      <View style={styles.appHeader}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>🎯</Text>
          </View>
          <View>
            <Text style={styles.brandName}>Cold Call Classroom</Text>
            <Text style={styles.brandTagline}>Every voice. Fairly heard.</Text>
          </View>
        </View>
        <View style={styles.privacyBadge}>
          <Text style={styles.privacyBadgeText}>✓ Free</Text>
        </View>
      </View>

      <View style={styles.screen}>
        {activeTab === 'pick' ? (
          <PickerScreen
            activeClass={activeClass}
            classes={data.classes}
            history={data.history}
            onGoToClasses={() => setActiveTab('classes')}
            onPick={pickStudent}
            onSetActiveClass={setActiveClass}
            onSetOutcome={setOutcome}
            onReturnToStudent={returnToStudent}
            pairSeconds={data.settings.pairSeconds}
            checkSeconds={data.settings.checkSeconds}
            postAnswerSeconds={data.settings.postAnswerSeconds}
            questionRoutine={data.settings.questionRoutine}
            roundState={activeClass ? data.roundStates[activeClass.id] : undefined}
            selectionMode={data.settings.selectionMode}
            showProgressToClass={data.settings.showProgressToClass}
            waitSeconds={data.settings.waitSeconds}
          />
        ) : null}

        {activeTab === 'classes' ? (
          <ClassesScreen
            activeClassId={activeClass?.id}
            classes={data.classes}
            onAddDemoClass={addDemoClass}
            onAddStudent={addStudent}
            onAddStudents={addStudents}
            onCreateClass={createClass}
            onDeleteClass={deleteClass}
            onDeleteStudent={deleteStudent}
            onSetActiveClass={setActiveClass}
            onResetAllPresent={resetAllPresent}
            onToggleSupportFirst={toggleSupportFirst}
            onToggleAbsent={toggleAbsent}
          />
        ) : null}

        {activeTab === 'history' ? (
          <HistoryScreen
            activeClass={activeClass}
            history={data.history}
            onClearHistory={clearHistory}
            onGoToPicker={() => setActiveTab('pick')}
          />
        ) : null}

        {activeTab === 'settings' ? (
          <SettingsScreen
            classCount={data.classes.length}
            historyCount={data.history.length}
            onDeleteAllData={deleteAllData}
            onUpdateSettings={updateSettings}
            settings={data.settings}
          />
        ) : null}
      </View>
      <TabBar activeTab={activeTab} onChange={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colours.canvas,
    flex: 1,
  },
  appHeader: {
    alignItems: 'center',
    backgroundColor: colours.canvas,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 68,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandIcon: {
    alignItems: 'center',
    backgroundColor: colours.purplePale,
    borderRadius: 15,
    height: 43,
    justifyContent: 'center',
    marginRight: 10,
    width: 43,
  },
  brandIconText: {
    fontSize: 23,
  },
  brandName: {
    color: colours.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  brandTagline: {
    color: colours.inkMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  privacyBadge: {
    backgroundColor: colours.mintPale,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  privacyBadgeText: {
    color: '#167A55',
    fontSize: 10,
    fontWeight: '900',
  },
  screen: {
    flex: 1,
  },
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: colours.canvas,
    flex: 1,
    justifyContent: 'center',
    padding: 30,
  },
  loadingIcon: {
    fontSize: 68,
  },
  loadingTitle: {
    color: colours.ink,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 16,
  },
  loadingText: {
    color: colours.inkMuted,
    fontSize: 14,
    marginTop: 7,
    textAlign: 'center',
  },
});
