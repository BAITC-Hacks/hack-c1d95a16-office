import { categoryIds, type Action, type Selection } from '../types';

export function selectedActions(selection: Selection, actions: Action[]): Action[] {
  return categoryIds.flatMap(category => {
    const action = actions.find(a => a.id === selection[category] && a.category === category);
    return action ? [action] : [];
  });
}
export const totalCost = (selection: Selection, actions: Action[]) =>
  Math.round(selectedActions(selection, actions).reduce((sum, a) => sum + a.cost, 0) * 100) / 100;

export function trySelect(selection: Selection, action: Action, actions: Action[], budget: number, districtId: string): Selection | null {
  if (!Number.isFinite(budget) || budget < 0) return null;
  const canonical = actions.find(a => a.id === action.id && a.category === action.category);
  if (!canonical || !Number.isFinite(canonical.cost) || canonical.cost < 0) return null;
  if (canonical.districtIds && !canonical.districtIds.includes(districtId)) return null;
  const next = { ...selection, [canonical.category]: canonical.id };
  return totalCost(next, actions) <= budget ? next : null;
}
