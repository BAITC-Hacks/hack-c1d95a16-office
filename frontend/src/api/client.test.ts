import {afterEach,describe,expect,it,vi} from 'vitest';
import {loadCityData,simulate,analyze,optimize} from './client';
import {parseSimulation,toWirePlan,parseAnalysis,parseOptimization} from './contracts';
import {DEMO_PLAN,demoCityData,demoSimulation} from '../data/demo';
import {validateSelection,upsertDecision,totalCost} from '../lib/budget';

const wire={valid:true,total_cost:95,remaining_budget:5,score:56.54307,baseline_score:52.55768,score_delta:3.98539,city_average:58.0776,weakest_district:'NURA',critical_count:0,districts:Object.fromEntries(demoSimulation.districtResults.map(d=>[d.id,{initial_score:d.beforeD,final_score:d.afterD,initial_indicators:d.before,final_indicators:d.after,indicator_deltas:d.deltas}]))};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
describe('API integration',()=>{
 it('sends per-measure districts and no client scores',()=>expect(toWirePlan(DEMO_PLAN)).toEqual({decisions:[{measure_id:'M7',district:'NURA'},{measure_id:'M8',district:'NURA'},{measure_id:'M10',district:'NURA'},{measure_id:'M12'},{measure_id:'M5',district:'SARYARKA'}]}));
 it('renders exact server numbers',()=>expect(parseSimulation(wire)).toEqual(demoSimulation));
 it('rejects incomplete or legacy responses',()=>{expect(()=>parseSimulation({spent:95,projectedScore:56})).toThrow();expect(()=>parseSimulation({...wire,districts:{NURA:wire.districts.NURA}})).toThrow();});
 it('posts to simulate',async()=>{const fetch=vi.fn().mockResolvedValue(reply(wire));vi.stubGlobal('fetch',fetch);expect(await simulate({decisions:DEMO_PLAN},'backend')).toEqual(demoSimulation);expect(fetch.mock.calls[0][0]).toMatch(/\/simulate$/);expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(toWirePlan(DEMO_PLAN));});
 it.each([400,422])('shows validation for %s',async status=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply({detail:'budget exceeded'},status)));await expect(simulate({decisions:DEMO_PLAN},'backend')).rejects.toThrow('Бюджеттен');});
 it('handles missing routes',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply({},404)));await expect(optimize({decisions:DEMO_PLAN},'backend')).rejects.toThrow('/optimize');});
 it('falls back on unavailable startup',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('offline')));const result=await loadCityData();expect(result.mode).toBe('demo');expect(result.fallbackReason).toContain('байланыс жоқ');expect(result.actions).toHaveLength(14);});
 it('does not hide cancellation with fallback',async()=>{const c=new AbortController();c.abort();vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new DOMException('Aborted','AbortError')));await expect(loadCityData(c.signal)).rejects.toThrow();});
 it('handles timeout without fabricated result',async()=>{vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn((_url,init)=>new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))));const task=expect(simulate({decisions:DEMO_PLAN},'backend')).rejects.toThrow('30 секунд');await vi.advanceTimersByTimeAsync(30001);await task;});
 it('preserves unavailable AI status',()=>expect(parseAnalysis({analysis:null,aiStatus:{status:'configuration_error'}}).analysis).toBeNull());
 it('preserves optimizer numbers and missing optional deltas',()=>{const result=parseOptimization({simulation:wire,scenarios:[{...wire,selected_measures:toWirePlan(DEMO_PLAN).decisions}],recommended:{improvement:0}});expect(result.recommended.score).toBe(wire.score);expect(result.costDelta).toBeNull();});
 it('runs the complete labelled demo fixture flow',async()=>{expect(await simulate({decisions:DEMO_PLAN},'demo')).toEqual(demoSimulation);expect((await analyze({decisions:DEMO_PLAN},'demo')).status).toBe('demo');expect((await optimize({decisions:DEMO_PLAN},'demo')).improvement).toBe(0);});
 it('never attributes a fixed demo score to another plan',async()=>{await expect(simulate({decisions:DEMO_PLAN.map((d,i)=>i===0?{...d,districtId:'ESIL'}:d)},'demo')).rejects.toThrow('үлгі сценарий');});
});
describe('selection rules',()=>{
 it('accepts the valid five-decision plan',()=>{expect(validateSelection(DEMO_PLAN,demoCityData,true)).toEqual([]);expect(totalCost(DEMO_PLAN,demoCityData.actions)).toBe(95);});
 it('requires exactly five',()=>expect(validateSelection([],demoCityData,true).join()).toContain('5'));
 it('rejects duplicate measures',()=>expect(validateSelection([DEMO_PLAN[0],DEMO_PLAN[0]],demoCityData).join()).toContain('бір рет'));
 it('requires a district',()=>expect(validateSelection([{actionId:'M7',districtId:null}],demoCityData).join()).toContain('аудан міндетті'));
 it('rejects district on city measure',()=>expect(validateSelection([{actionId:'M12',districtId:'NURA'}],demoCityData).join()).toContain('қалалық'));
 it('limits each category to two',()=>expect(validateSelection(['M7','M8','M9'].map(actionId=>({actionId,districtId:'NURA'})),demoCityData).join()).toContain('ең көбі 2'));
 it('blocks overspend',()=>expect(validateSelection(['M3','M5','M7','M13'].map(actionId=>({actionId,districtId:'NURA'})),demoCityData).join()).toContain('бюджеттен'));
 it.each([['M1','M3'],['M4','M7'],['M5','M13']])('blocks conflict %s %s',(a,b)=>expect(validateSelection([{actionId:a,districtId:'NURA'},{actionId:b,districtId:'NURA'}],demoCityData).length).toBeGreaterThan(0));
 it('allows district-specific pair in different districts',()=>expect(validateSelection([{actionId:'M4',districtId:'ESIL'},{actionId:'M7',districtId:'NURA'}],demoCityData)).toEqual([]));
 it('updates one decision instead of duplicating',()=>expect(upsertDecision(DEMO_PLAN,{actionId:'M7',districtId:'ESIL'})).toHaveLength(5));
});
