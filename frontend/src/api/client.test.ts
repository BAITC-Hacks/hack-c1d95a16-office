import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoData } from '../data/demo';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', 'https://test.invalid');
  vi.stubEnv('VITE_BOOTSTRAP_PATH', '/test-bootstrap');
  vi.stubEnv('VITE_SIMULATE_PATH', '/test-simulate');
  vi.stubEnv('VITE_ANALYZE_PATH', '/test-analyze');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('API adapter (mocked fetch, not a live backend)', () => {
  it('uses demo only when no backend is configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const client = await import('./client');
    expect(client.isDemo).toBe(true);
    expect(await client.loadCityData()).toEqual(demoData);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not guess a route', async () => {
    vi.stubEnv('VITE_BOOTSTRAP_PATH', '');
    const client = await import('./client');
    await expect(client.loadCityData()).rejects.toThrow('API жолы бапталмаған');
  });
  it('validates a successful configured response', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(demoData)); vi.stubGlobal('fetch', fetch);
    const client = await import('./client');
    expect(await client.loadCityData()).toEqual(demoData);
    expect(fetch.mock.calls[0][0]).toBe('https://test.invalid/test-bootstrap');
  });
  it('propagates an empty dataset for the empty UI state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...demoData, districts: [], actions: [] })));
    expect((await (await import('./client')).loadCityData()).districts).toEqual([]);
  });
  it('rejects invalid response shape instead of showing fake data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ score: 99 })));
    await expect((await import('./client')).loadCityData()).rejects.toThrow('дерек құрылымына');
  });
  it('shows service errors without falling back to demo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    const client = await import('./client');
    expect(client.isDemo).toBe(false);
    await expect(client.loadCityData()).rejects.toThrow('500');
  });
  it('reports network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect((await import('./client')).loadCityData()).rejects.toThrow('Backend-пен байланыс жоқ');
  });
  it('forwards cancellation to fetch', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => {
      expect(init.signal?.aborted).toBe(true);
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }));
    const controller = new AbortController(); controller.abort();
    await expect((await import('./client')).loadCityData(controller.signal)).rejects.toThrow('Aborted');
  });
  it('rejects simulation data from a different dataset version', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ scenarioId: 's', datasetVersion: 'old', spent: 0, remaining: 100, baselineScore: 1, projectedScore: 2, metrics: [] })));
    await expect((await import('./client')).simulate({ datasetVersion: 'current', districtId: 'd', actionIds: [] })).rejects.toThrow('дерек нұсқасы');
  });
  it('rejects AI output for a different scenario', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ scenarioId: 'other', summary: 'Test fixture only', strengths: [], risks: [], recommendations: [] })));
    await expect((await import('./client')).analyze({ scenarioId: 's', datasetVersion: 'current', spent: 0, remaining: 100, baselineScore: 1, projectedScore: 2, metrics: [], assumptions: [] })).rejects.toThrow('ағымдағы сценарийге');
  });
});
