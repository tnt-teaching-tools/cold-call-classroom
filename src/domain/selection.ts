import type { RoundState } from '../types';

export type RandomSource = () => number;

export interface NextPickResult {
  studentId?: string;
  state: RoundState;
  startedNewRound: boolean;
}

export const EMPTY_ROUND_STATE: RoundState = {
  queue: [],
  pickedThisRound: [],
  round: 0,
};

export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[otherIndex] as T;
    copy[otherIndex] = current as T;
  }
  return copy;
}

function reconcileRound(state: RoundState, eligibleIds: readonly string[]): RoundState {
  const eligible = new Set(eligibleIds);
  const queue = state.queue.filter((id) => eligible.has(id));
  const pickedThisRound = state.pickedThisRound.filter((id) => eligible.has(id));
  const alreadyIncluded = new Set([...queue, ...pickedThisRound]);
  const newlyEligible = eligibleIds.filter((id) => !alreadyIncluded.has(id));

  return {
    ...state,
    queue: [...queue, ...newlyEligible],
    pickedThisRound,
  };
}

function beginRound(
  eligibleIds: readonly string[],
  previous: RoundState,
  random: RandomSource,
): RoundState {
  const queue = shuffle(eligibleIds, random);

  if (queue.length > 1 && queue[0] === previous.lastPickedId) {
    const swap = queue[0];
    queue[0] = queue[1] as string;
    queue[1] = swap as string;
  }

  return {
    queue,
    pickedThisRound: [],
    lastPickedId: previous.lastPickedId,
    round: previous.round + 1,
  };
}

export function nextFairPick(
  currentState: RoundState | undefined,
  eligibleIds: readonly string[],
  random: RandomSource = Math.random,
): NextPickResult {
  const uniqueEligibleIds = [...new Set(eligibleIds)];
  const baseState = currentState ?? EMPTY_ROUND_STATE;

  if (uniqueEligibleIds.length === 0) {
    return { studentId: undefined, state: baseState, startedNewRound: false };
  }

  let state = reconcileRound(baseState, uniqueEligibleIds);
  let startedNewRound = false;

  if (state.queue.length === 0) {
    state = beginRound(uniqueEligibleIds, state, random);
    startedNewRound = true;
  }

  const [studentId, ...remainingQueue] = state.queue;
  if (!studentId) {
    return { studentId: undefined, state, startedNewRound };
  }

  return {
    studentId,
    startedNewRound,
    state: {
      ...state,
      queue: remainingQueue,
      pickedThisRound: [...state.pickedThisRound, studentId],
      lastPickedId: studentId,
    },
  };
}

export function nextRandomPick(
  currentState: RoundState | undefined,
  eligibleIds: readonly string[],
  random: RandomSource = Math.random,
): NextPickResult {
  const uniqueEligibleIds = [...new Set(eligibleIds)];
  const state = currentState ?? EMPTY_ROUND_STATE;
  if (!uniqueEligibleIds.length) return { studentId: undefined, state, startedNewRound: false };
  const studentId = uniqueEligibleIds[Math.floor(random() * uniqueEligibleIds.length)];
  return { studentId, state: { ...state, lastPickedId: studentId }, startedNewRound: false };
}

export function nextMixedPick(
  currentState: RoundState | undefined,
  eligibleIds: readonly string[],
  random: RandomSource = Math.random,
): NextPickResult {
  const state = currentState ?? EMPTY_ROUND_STATE;
  const revisitable = state.pickedThisRound.filter(
    (id) => eligibleIds.includes(id) && id !== state.lastPickedId,
  );
  if (revisitable.length && random() < 0.25) {
    const studentId = revisitable[Math.floor(random() * revisitable.length)];
    return { studentId, state: { ...state, lastPickedId: studentId }, startedNewRound: false };
  }
  return nextFairPick(state, eligibleIds, random);
}

export function roundProgress(state: RoundState | undefined, eligibleCount: number) {
  const picked = Math.min(state?.pickedThisRound.length ?? 0, eligibleCount);
  return {
    picked,
    eligible: eligibleCount,
    percentage: eligibleCount === 0 ? 0 : Math.round((picked / eligibleCount) * 100),
    round: Math.max(state?.round ?? 0, 1),
  };
}
