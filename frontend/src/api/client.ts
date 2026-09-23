import { z } from 'zod';
import { analysisSchema, cityDataSchema, simulationSchema, type Plan, type SimulationResult } from '../types';
import { demoData } from '../data/demo';

const base = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';
export const isDemo = !base;
export const canSimulate = Boolean(base && import.meta.env.VITE_SIMULATE_PATH?.trim());
export const canAnalyze = Boolean(base && import.meta.env.VITE_ANALYZE_PATH?.trim());

// All paths and response shapes are a PROPOSED contract, pending Member 2.
// There are intentionally no guessed route defaults or browser-side AI keys.
async function request<T>(path: string | undefined, schema: z.ZodType<T>, body?: unknown, signal?: AbortSignal): Promise<T> {
  if (!path?.trim()) throw new Error('API жолы бапталмаған. Member 2 берген маршрутты енгізіңіз.');
  if (!/^https?:\/\//.test(base)) throw new Error('Backend адресі http:// немесе https:// арқылы басталуы керек.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) controller.abort();
  let timeout = false;
  const timer = setTimeout(() => { timeout = true; controller.abort(); }, 30000);
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const details: Record<number, string> = {
        401: 'Backend-ке кіру рұқсаты қажет.', 403: 'Backend сұранымға рұқсат бермеді.',
        422: 'Backend таңдауларды қабылдамады. Бюджет пен деректерді тексеріңіз.',
        429: 'Сұраным шегіне жетті. Біраздан кейін қайталап көріңіз.',
      };
      throw new Error(details[response.status] ?? `Сервис қатесі (${response.status}). Қайталап көріңіз.`);
    }
    const raw: unknown = await response.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) throw new Error('Backend жауабы келісілген дерек құрылымына сәйкес емес.');
    return parsed.data;
  } catch (error) {
    if (timeout) throw new Error('Сервис 30 секунд ішінде жауап бермеді. Қайталап көріңіз.');
    if (error instanceof TypeError) throw new Error('Backend-пен байланыс жоқ. Сервер адресі мен CORS баптауын тексеріңіз.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export async function loadCityData(signal?: AbortSignal) {
  if (isDemo) return cityDataSchema.parse(demoData);
  return request(import.meta.env.VITE_BOOTSTRAP_PATH, cityDataSchema, undefined, signal);
}
export async function simulate(plan: Plan, signal?: AbortSignal) {
  const result = await request(import.meta.env.VITE_SIMULATE_PATH, simulationSchema, plan, signal);
  if (result.datasetVersion !== plan.datasetVersion) throw new Error('Сценарийдің дерек нұсқасы сәйкес емес. Бастапқы деректерді қайта жүктеңіз.');
  return result;
}
export async function analyze(result: SimulationResult, signal?: AbortSignal) {
  // Server must look up/recompute this scenario. Never trust a browser-supplied score.
  const analysis = await request(import.meta.env.VITE_ANALYZE_PATH, analysisSchema,
    { scenarioId: result.scenarioId, datasetVersion: result.datasetVersion }, signal);
  if (analysis.scenarioId !== result.scenarioId) throw new Error('AI талдауы ағымдағы сценарийге сәйкес емес.');
  return analysis;
}
