import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { byClass, byTag, handlersWith, mountOne, uiWith } from './dom.ts';
import { setCalendarZone } from '../client/format.ts';
import { renderItem } from '../client/items.ts';
import type { DashboardState, ResolvedItem } from '../src/types.ts';

const now = '2026-10-08T12:00:00Z';
const state = { now, session: { active: null }, agenda: { conflictIds: [] } } as unknown as DashboardState;

function item(overrides: Partial<ResolvedItem> = {}): ResolvedItem {
  return {
    id: 'email:invented-thread-1',
    source: 'email',
    kind: 'task',
    title: 'Send the draft',
    due: '2026-10-10',
    status: 'open',
    notes: [],
    ageDays: 0,
    ...overrides,
  };
}

afterEach(() => setCalendarZone(undefined));

test('clicking a due pill opens the native date picker and saves the selected day', () => {
  setCalendarZone('UTC');
  let saved: { id: string; action: string; due?: string | null } | null = null;
  const row = item();
  const node = mountOne(renderItem(row, state, uiWith(), handlersWith({
    onAction: (id, action, extra) => { saved = { id, action, due: extra?.due }; },
  })));

  const button = byClass(node, 'pill--due')[0] as HTMLButtonElement;
  const input = byClass(node, 'due-picker__input')[0] as HTMLInputElement;
  assert.equal(button.tagName, 'BUTTON');
  assert.match(button.textContent ?? '', /due in 2 days/);
  assert.equal(input.value, '2026-10-10');

  let opened = false;
  input.showPicker = () => { opened = true; };
  button.click();
  assert.equal(opened, true);

  input.value = '2026-10-14';
  input.dispatchEvent(new Event('change', { bubbles: true }));
  assert.deepEqual(saved, { id: row.id, action: 'set-due', due: '2026-10-14' });
});

test('a user-edited date stays clickable even when it is more than a week away', () => {
  setCalendarZone('UTC');
  let reset: unknown;
  const node = mountOne(renderItem(item({ due: '2026-11-08', dueOverridden: true }), state, uiWith(), handlersWith({
    onAction: (_id, _action, extra) => { reset = extra?.due; },
  })));
  assert.equal(byClass(node, 'pill--due').length, 1);
  const input = byTag(node, 'input').find((entry) => (entry as HTMLInputElement).type === 'date') as HTMLInputElement;
  assert.ok(input);
  input.value = '';
  input.dispatchEvent(new Event('change', { bubbles: true }));
  assert.equal(reset, null, 'clearing an edited date restores the source date');
});
