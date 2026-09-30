import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatStudentLabel,
  parseSafeRoster,
  validateStudentInput,
} from '../src/domain/students';

test('accepts a first name and one surname initial', () => {
  const result = validateStudentInput('sophie', 't.');
  assert.deepEqual(result, {
    valid: true,
    firstName: 'Sophie',
    lastInitial: 'T',
  });
});

test('rejects a full surname', () => {
  const result = validateStudentInput('Sophie', 'Taylor');
  assert.equal(result.valid, false);
  assert.match(result.error ?? '', /one surname initial/i);
});

test('rejects multiple given names', () => {
  const result = validateStudentInput('Sophie Jane', 'T');
  assert.equal(result.valid, false);
  assert.match(result.error ?? '', /one first name/i);
});

test('safe roster import rejects unsafe lines instead of silently storing them', () => {
  const result = parseSafeRoster('Sophie, T\nAroha M.\nTama Rangi');
  assert.deepEqual(result.valid, [
    { firstName: 'Sophie', lastInitial: 'T' },
    { firstName: 'Aroha', lastInitial: 'M' },
  ]);
  assert.equal(result.invalid.length, 1);
  assert.equal(result.invalid[0]?.line, 'Tama Rangi');
});

test('display label never expands beyond the stored initial', () => {
  assert.equal(formatStudentLabel({ firstName: 'Aroha', lastInitial: 'M' }), 'Aroha M.');
});
