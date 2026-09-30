import type { Student } from '../types';
import { accentOptions, avatarOptions } from '../theme';
import { makeId } from './ids';

const FIRST_NAME_PATTERN = /^\p{L}[\p{L}'’\-]*$/u;
const INITIAL_PATTERN = /^\p{L}$/u;

export interface StudentInput {
  firstName: string;
  lastInitial: string;
}

export interface ValidationResult {
  valid: boolean;
  firstName?: string;
  lastInitial?: string;
  error?: string;
}

export interface RosterParseResult {
  valid: StudentInput[];
  invalid: Array<{ line: string; reason: string }>;
}

export function normaliseFirstName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toLocaleUpperCase() + trimmed.slice(1);
}

export function normaliseInitial(value: string): string {
  return value.trim().replace('.', '').toLocaleUpperCase();
}

export function validateStudentInput(
  firstNameValue: string,
  lastInitialValue: string,
): ValidationResult {
  const firstName = normaliseFirstName(firstNameValue);
  const lastInitial = normaliseInitial(lastInitialValue);

  if (!firstName) {
    return { valid: false, error: 'Enter a first name.' };
  }
  if (!FIRST_NAME_PATTERN.test(firstName)) {
    return {
      valid: false,
      error: 'Use one first name only. Hyphens and apostrophes are accepted.',
    };
  }
  if (!lastInitial) {
    return { valid: false, error: 'Enter one surname initial.' };
  }
  if (!INITIAL_PATTERN.test(lastInitial)) {
    return {
      valid: false,
      error: 'Only one surname initial is allowed. Full surnames are not stored.',
    };
  }

  return { valid: true, firstName, lastInitial };
}

export function formatStudentLabel(student: Pick<Student, 'firstName' | 'lastInitial'>): string {
  return `${student.firstName} ${student.lastInitial}.`;
}

export function createStudent(input: StudentInput, indexHint = 0): Student {
  const validation = validateStudentInput(input.firstName, input.lastInitial);
  if (!validation.valid || !validation.firstName || !validation.lastInitial) {
    throw new Error(validation.error ?? 'Invalid student details.');
  }
  const optionIndex = Math.abs(indexHint) % avatarOptions.length;
  return {
    id: makeId('student'),
    firstName: validation.firstName,
    lastInitial: validation.lastInitial,
    avatar: avatarOptions[optionIndex] ?? '🌟',
    accent: accentOptions[optionIndex] ?? accentOptions[0] ?? '#BD3F0C',
    absent: false,
  };
}

export function parseSafeRoster(text: string): RosterParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const result: RosterParseResult = { valid: [], invalid: [] };

  for (const line of lines) {
    const commaParts = line.includes(',') ? line.split(',').map((part) => part.trim()) : [];
    const spaceParts = line.split(/\s+/).map((part) => part.trim());
    const parts = commaParts.length === 2 ? commaParts : spaceParts;

    if (parts.length !== 2) {
      result.invalid.push({
        line,
        reason: 'Use the format “First, L” or “First L.”',
      });
      continue;
    }

    const validation = validateStudentInput(parts[0] ?? '', parts[1] ?? '');
    if (!validation.valid || !validation.firstName || !validation.lastInitial) {
      result.invalid.push({ line, reason: validation.error ?? 'Invalid entry.' });
      continue;
    }

    result.valid.push({
      firstName: validation.firstName,
      lastInitial: validation.lastInitial,
    });
  }

  return result;
}
