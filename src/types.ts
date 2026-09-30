export type TabKey = 'pick' | 'classes' | 'history' | 'settings';

export type Outcome = 'correct' | 'partial' | 'not_yet' | 'unmarked';
export type SelectionMode = 'whole_class' | 'random' | 'mixed';
export type QuestionRoutine = 'cold_call' | 'think_pair_share' | 'check_everyone';

export interface Student {
  id: string;
  firstName: string;
  lastInitial: string;
  avatar: string;
  accent: string;
  absent: boolean;
  supportFirst?: boolean;
}

export interface ClassRoster {
  id: string;
  name: string;
  students: Student[];
  createdAt: string;
  updatedAt: string;
}

export interface RoundState {
  queue: string[];
  pickedThisRound: string[];
  lastPickedId?: string;
  round: number;
}

export interface PickRecord {
  id: string;
  classId: string;
  className: string;
  studentId: string;
  studentLabel: string;
  studentAvatar: string;
  timestamp: string;
  outcome: Outcome;
  bouncedFromPickId?: string;
}

export interface AppSettings {
  waitSeconds: number;
  pairSeconds: number;
  checkSeconds: number;
  postAnswerSeconds: number;
  selectionMode: SelectionMode;
  questionRoutine: QuestionRoutine;
  showProgressToClass: boolean;
}

export interface AppData {
  version: 1;
  classes: ClassRoster[];
  activeClassId?: string;
  roundStates: Record<string, RoundState>;
  history: PickRecord[];
  settings: AppSettings;
}

export const EMPTY_APP_DATA: AppData = {
  version: 1,
  classes: [],
  roundStates: {},
  history: [],
  settings: {
    waitSeconds: 5,
    pairSeconds: 20,
    checkSeconds: 15,
    postAnswerSeconds: 3,
    selectionMode: 'whole_class',
    questionRoutine: 'cold_call',
    showProgressToClass: true,
  },
};
