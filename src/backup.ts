import { formatStudentLabel, validateStudentInput } from './domain/students';
import { EMPTY_APP_DATA, type AppData } from './types';

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
function fail(): never { throw new Error('This is not a valid Cold Call Classroom backup. Nothing has been changed.'); }
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : fail();
const str = (v: unknown, max = 200): string => typeof v === 'string' && v.length > 0 && v.length <= max ? v : fail();
const id = (v: unknown): string => { const s = str(v); return /^[A-Za-z0-9_-]+$/.test(s) ? s : fail(); };
const bool = (v: unknown): boolean => typeof v === 'boolean' ? v : fail();
const array = (v: unknown, max: number): unknown[] => Array.isArray(v) && v.length <= max ? v : fail();
const date = (v: unknown): string => { const s = str(v, 40); return Number.isFinite(Date.parse(s)) ? s : fail(); };
const number = (v: unknown, max: number): number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : fail();
const choice = <T extends string>(v: unknown, choices: readonly T[]): T => choices.includes(v as T) ? v as T : fail();

export function encodeBackup(data: AppData): string {
  return JSON.stringify({ app: 'cold-call-classroom', backupVersion: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

export function decodeBackup(text: string): AppData {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) fail();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { fail(); }
  const root = object(parsed);
  if (root.app !== 'cold-call-classroom' || root.backupVersion !== 1) fail();
  const d = object(root.data);
  if (d.version !== 1) fail();
  const classIds = new Set<string>(), studentIds = new Set<string>();
  const classes = array(d.classes, 500).map(item => {
    const c = object(item), classId = id(c.id);
    if (classIds.has(classId)) fail(); classIds.add(classId);
    const students = array(c.students, 1000).map(item => {
      const s = object(item), studentId = id(s.id);
      if (studentIds.has(studentId)) fail(); studentIds.add(studentId);
      const firstName = str(s.firstName, 100), lastInitial = str(s.lastInitial, 4);
      if (!validateStudentInput(firstName, lastInitial).valid) fail();
      const accent = str(s.accent, 7); if (!/^#[0-9a-f]{6}$/i.test(accent)) fail();
      return { id: studentId, firstName, lastInitial, avatar: str(s.avatar, 20), accent, absent: bool(s.absent), ...(s.supportFirst === undefined ? {} : { supportFirst: bool(s.supportFirst) }) };
    });
    return { id: classId, name: str(c.name), students, createdAt: date(c.createdAt), updatedAt: date(c.updatedAt) };
  });
  const historyIds = new Set<string>();
  const history = array(d.history, 50000).map(item => {
    const h = object(item), recordId = id(h.id), classId = id(h.classId), studentId = id(h.studentId);
    if (historyIds.has(recordId)) fail(); historyIds.add(recordId);
    const roster = classes.find(c => c.id === classId), student = roster?.students.find(s => s.id === studentId);
    if (!roster || !student) fail();
    return { id: recordId, classId, studentId, className: roster.name, studentLabel: formatStudentLabel(student), studentAvatar: student.avatar, timestamp: date(h.timestamp), outcome: choice(h.outcome, ['correct','partial','not_yet','unmarked'] as const), ...(h.bouncedFromPickId === undefined ? {} : { bouncedFromPickId: id(h.bouncedFromPickId) }) };
  });
  const roundStates: AppData['roundStates'] = {};
  for (const [classId, value] of Object.entries(object(d.roundStates))) {
    const roster = classes.find(c => c.id === classId); if (!roster) fail();
    const r = object(value);
    const studentList = (v: unknown) => { const list = array(v, 1000).map(id); if (new Set(list).size !== list.length || list.some(i => !roster.students.some(s => s.id === i))) fail(); return list; };
    const lastPickedId = r.lastPickedId === undefined ? undefined : id(r.lastPickedId);
    if (lastPickedId && !roster.students.some(s => s.id === lastPickedId)) fail();
    roundStates[classId] = { queue: studentList(r.queue), pickedThisRound: studentList(r.pickedThisRound), round: number(r.round, 10000000), ...(lastPickedId ? { lastPickedId } : {}) };
  }
  const s = object(d.settings);
  const settings = { ...EMPTY_APP_DATA.settings, waitSeconds: number(s.waitSeconds,60), pairSeconds: number(s.pairSeconds,120), checkSeconds: number(s.checkSeconds,120), postAnswerSeconds: number(s.postAnswerSeconds,15), selectionMode: choice(s.selectionMode,['whole_class','random','mixed'] as const), questionRoutine: choice(s.questionRoutine,['cold_call','think_pair_share','check_everyone'] as const), showProgressToClass: bool(s.showProgressToClass) };
  const activeClassId = d.activeClassId === undefined ? undefined : id(d.activeClassId);
  if (activeClassId && !classIds.has(activeClassId)) fail();
  return { version: 1, classes, history, roundStates, settings, ...(activeClassId ? { activeClassId } : {}) };
}

export function downloadBackup(data: AppData): void {
  const text = encodeBackup(data);
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('The backup is too large. Export supports up to 5 MB.');
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url;
  link.download = `cold-call-classroom-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function chooseBackup(onRead: (data: AppData) => void, onError: (message: string) => void): void {
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
  input.onchange = async () => {
    const file = input.files?.[0]; if (!file) return;
    try { if (file.size > MAX_BACKUP_BYTES) throw new Error('Choose a backup smaller than 5 MB.'); onRead(decodeBackup(await file.text())); }
    catch (e) { onError(e instanceof Error ? e.message : 'The backup could not be opened.'); }
  };
  input.click();
}
