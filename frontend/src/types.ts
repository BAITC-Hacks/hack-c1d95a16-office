import { z } from 'zod';

export const categoryIds = ['transport', 'green', 'social', 'safety', 'services'] as const;
export type CategoryId = typeof categoryIds[number];
export const categories: { id: CategoryId; name: string; short: string; description: string }[] = [
  { id: 'transport', name: 'Көлік', short: 'Көлік', description: 'Қаладағы қозғалысты ыңғайлы ету' },
  { id: 'green', name: 'Көгалдандыру', short: 'Жасыл орта', description: 'Тұрғындарға жайлы жасыл кеңістік' },
  { id: 'social', name: 'Әлеуметтік инфрақұрылым', short: 'Әлеуметтік сала', description: 'Күнделікті қажеттіліктерге қолжетімділік' },
  { id: 'safety', name: 'Қауіпсіздік', short: 'Қауіпсіздік', description: 'Қоғамдық орындардағы қауіпсіздік' },
  { id: 'services', name: 'Қалалық сервис', short: 'Қызметтер', description: 'Тұрғындарға сапалы қызмет көрсету' },
];

const finite = z.number().finite();
// Money is exchanged with at most two fractional digits in this proposed contract.
const money = finite.nonnegative().refine(value => Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, 'Money must have at most two fractional digits');
export const actionSchema = z.object({
  id: z.string().min(1), category: z.enum(categoryIds), title: z.string().min(1),
  description: z.string(), cost: money,
  districtIds: z.array(z.string()).optional(),
});
export const districtSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), description: z.string(),
  population: finite.nonnegative().optional(),
  metrics: z.array(z.object({ label: z.string(), value: finite, unit: z.string() })),
});
export const cityDataSchema = z.object({
  datasetVersion: z.string().min(1), cityName: z.string(),
  budget: money.refine(value => value > 0), budgetUnit: z.string().min(1),
  districts: z.array(districtSchema), actions: z.array(actionSchema),
}).superRefine((data, ctx) => {
  for (const [name, items] of [['districts', data.districts], ['actions', data.actions]] as const) {
    if (new Set(items.map(x => x.id)).size !== items.length) {
      ctx.addIssue({ code: 'custom', path: [name], message: 'IDs must be unique' });
    }
  }
  const ids = new Set(data.districts.map(d => d.id));
  for (const action of data.actions) {
    if (action.districtIds?.some(id => !ids.has(id))) {
      ctx.addIssue({ code: 'custom', path: ['actions'], message: 'Unknown district ID' });
    }
  }
});
export const simulationSchema = z.object({
  scenarioId: z.string().min(1), datasetVersion: z.string(),
  spent: money, remaining: money,
  baselineScore: finite, projectedScore: finite,
  metrics: z.array(z.object({ label: z.string(), before: finite, after: finite, unit: z.string() })),
  assumptions: z.array(z.string()).default([]),
});
export const analysisSchema = z.object({
  scenarioId: z.string(), summary: z.string().min(1),
  strengths: z.array(z.string()), risks: z.array(z.string()), recommendations: z.array(z.string()),
});
export type Action = z.infer<typeof actionSchema>;
export type CityData = z.infer<typeof cityDataSchema>;
export type District = z.infer<typeof districtSchema>;
export type SimulationResult = z.infer<typeof simulationSchema>;
export type AnalysisResult = z.infer<typeof analysisSchema>;
export type Selection = Partial<Record<CategoryId, string>>;
export interface Plan { datasetVersion: string; districtId: string; actionIds: string[] }
