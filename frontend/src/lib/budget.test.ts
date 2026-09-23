import { describe, expect, it } from 'vitest';
import { demoData } from '../data/demo';
import { cityDataSchema, type Selection } from '../types';
import { selectedActions, totalCost, trySelect } from './budget';

const data = cityDataSchema.parse(demoData);
const action = (id: string) => data.actions.find(item => item.id === id)!;
const select = (selection: Selection, id: string, budget = 100) => trySelect(selection, action(id), data.actions, budget, data.districts[0].id);

describe('budget selection', () => {
  it('starts with zero spending', () => expect(totalCost({}, data.actions)).toBe(0));
  it('adds an action', () => expect(totalCost(select({}, 't1')!, data.actions)).toBe(12));
  it('replaces rather than accumulates actions in the same category', () => {
    const next = select(select({}, 't1')!, 't2')!;
    expect(totalCost(next, data.actions)).toBe(24);
    expect(selectedActions(next, data.actions)).toHaveLength(1);
  });
  it('allows exactly the full budget across five categories', () => {
    const next = ['t2', 'g2', 's2', 'p3', 'c1'].reduce((current, id) => select(current, id)!, {});
    expect(totalCost(next, data.actions)).toBe(100);
    expect(selectedActions(next, data.actions)).toHaveLength(5);
    expect(select(next, 't3')).toBeNull();
  });
  it('does not mutate previous selections after rejection', () => {
    const before = { transport: 't3', social: 's3' };
    expect(select(before, 'p3')).toBeNull();
    expect(before).toEqual({ transport: 't3', social: 's3' });
  });
  it('refunds the old action before evaluating affordability', () => {
    const before = { transport: 't3', social: 's3', green: 'g3' };
    expect(totalCost(select(before, 't1')!, data.actions)).toBe(74);
  });
  it('uses canonical prices and rejects unknown actions', () => {
    expect(trySelect({}, { ...action('t3'), cost: 0 }, data.actions, 10, data.districts[0].id)).toBeNull();
    expect(trySelect({}, { ...action('t3'), id: 'unknown' }, data.actions, 100, data.districts[0].id)).toBeNull();
  });
  it('honors district restrictions', () => {
    const restricted = { ...action('t1'), districtIds: ['elsewhere'] };
    expect(trySelect({}, restricted, [restricted], 100, data.districts[0].id)).toBeNull();
  });
  it('handles fractional prices without floating point overspending', () => {
    const items = [{ ...action('t1'), cost: 0.1 }, { ...action('g1'), cost: 0.2 }];
    expect(trySelect({ transport: 't1' }, items[1], items, 0.3, data.districts[0].id)).toEqual({ transport: 't1', green: 'g1' });
  });
  it('rejects invalid budgets', () => expect(select({}, 't1', NaN)).toBeNull());
});

describe('incoming data validation', () => {
  it('accepts the labelled demo fixture', () => expect(cityDataSchema.safeParse(demoData).success).toBe(true));
  it('rejects duplicate action IDs', () => expect(cityDataSchema.safeParse({ ...data, actions: [action('t1'), action('t1')] }).success).toBe(false));
  it('rejects negative costs', () => expect(cityDataSchema.safeParse({ ...data, actions: [{ ...action('t1'), cost: -1 }] }).success).toBe(false));
  it('rejects unsupported fractional precision', () => expect(cityDataSchema.safeParse({ ...data, actions: [{ ...action('t1'), cost: 0.001 }] }).success).toBe(false));
  it('rejects references to unknown districts', () => expect(cityDataSchema.safeParse({ ...data, actions: [{ ...action('t1'), districtIds: ['missing'] }] }).success).toBe(false));
  it('allows empty datasets so the UI can show its empty state', () => expect(cityDataSchema.safeParse({ ...data, actions: [], districts: [] }).success).toBe(true));
});
