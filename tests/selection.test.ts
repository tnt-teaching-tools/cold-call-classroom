import assert from 'node:assert/strict';
import test from 'node:test';

import { nextFairPick, nextMixedPick, nextRandomPick, roundProgress } from '../src/domain/selection';
import type { RoundState } from '../src/types';

const predictableRandom = () => 0.37;

test('selects every eligible student before a repeat', () => {
  const eligible = ['a', 'b', 'c', 'd'];
  let state: RoundState | undefined;
  const picked: string[] = [];

  for (let index = 0; index < eligible.length; index += 1) {
    const result = nextFairPick(state, eligible, predictableRandom);
    assert.ok(result.studentId);
    picked.push(result.studentId);
    state = result.state;
  }

  assert.deepEqual(new Set(picked), new Set(eligible));
  assert.equal(new Set(picked).size, eligible.length);
});

test('does not immediately repeat the final student when a new round begins', () => {
  const eligible = ['a', 'b', 'c'];
  let state: RoundState | undefined;
  let previous: string | undefined;

  for (let index = 0; index < eligible.length; index += 1) {
    const result = nextFairPick(state, eligible, predictableRandom);
    previous = result.studentId;
    state = result.state;
  }

  const nextRound = nextFairPick(state, eligible, predictableRandom);
  assert.notEqual(nextRound.studentId, previous);
  assert.equal(nextRound.startedNewRound, true);
});

test('removes an absent student from the remaining round', () => {
  const first = nextFairPick(undefined, ['a', 'b', 'c'], predictableRandom);
  const absentId = first.state.queue[0];
  const eligible = ['a', 'b', 'c'].filter((id) => id !== absentId);
  const second = nextFairPick(first.state, eligible, predictableRandom);

  assert.notEqual(second.studentId, absentId);
  assert.equal(second.state.queue.includes(absentId ?? ''), false);
});

test('adds a newly present student to the current round', () => {
  const first = nextFairPick(undefined, ['a', 'b'], predictableRandom);
  const second = nextFairPick(first.state, ['a', 'b', 'c'], predictableRandom);
  const remaining = [second.studentId, ...second.state.queue];
  assert.equal(remaining.includes('c'), true);
});

test('calculates fair coverage progress', () => {
  const state: RoundState = {
    queue: ['c', 'd'],
    pickedThisRound: ['a', 'b'],
    lastPickedId: 'b',
    round: 2,
  };
  assert.deepEqual(roundProgress(state, 4), {
    picked: 2,
    eligible: 4,
    percentage: 50,
    round: 2,
  });
});

test('fully random mode can revisit a student immediately', () => {
  const first = nextRandomPick(undefined, ['a', 'b'], () => 0);
  const second = nextRandomPick(first.state, ['a', 'b'], () => 0);
  assert.equal(first.studentId, 'a');
  assert.equal(second.studentId, 'a');
});

test('mixed mode can revisit a previously selected student', () => {
  const state: RoundState = {
    queue: ['c'],
    pickedThisRound: ['a', 'b'],
    lastPickedId: 'b',
    round: 1,
  };
  const result = nextMixedPick(state, ['a', 'b', 'c'], () => 0);
  assert.equal(result.studentId, 'a');
  assert.deepEqual(result.state.queue, ['c']);
});
