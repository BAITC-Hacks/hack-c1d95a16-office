import {afterEach,describe,expect,it,vi} from 'vitest';
import {loadCityData,simulate,analyze,optimize,toBackendPlan} from './client';
import {parseSimulation,toWirePlan,parseAnalysis,parseOptimization} from './contracts';
import {DEMO_PLAN,demoCityData,demoSimulation,demoAnalysis} from '../data/demo';
import {validateSelection,upsertDecision,totalCost} from '../lib/budget';

const wire={valid:true,total_cost:95,remaining_budget:5,score:56.54307,baseline_score:52.55768,score_delta:3.98539,city_average:58.0776,weakest_district:'NURA',critical_count:0,districts:Object.fromEntries(demoSimulation.districtResults.map(d=>[d.id,{initial_score:d.beforeD,final_score:d.afterD,initial_indicators:d.before,final_indicators:d.after,indicator_deltas:d.deltas}]))};
const backendPlan={datasetVersion:'sim-test',decisions:DEMO_PLAN.map(d=>({...d,districtId:d.districtId?'NURA':null}))};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
describe('API integration',()=>{
 it('accepts all four AI structures and five executive fields',()=>{
 const council={...demoAnalysis.analysis!,optimizer:{...demoAnalysis.analysis!.optimizer,recommended_scenario:toWirePlan(DEMO_PLAN).decisions}};
 const parsed=parseAnalysis({simulation:wire,analysis:council,aiStatus:{status:'available'}});
 expect(parsed.analysis?.executive).toEqual(demoAnalysis.analysis!.executive);
 expect(Object.keys(parsed.analysis!.executive)).toEqual(['executive_summary','top_strengths','main_risks','recommended_actions','final_comment']);
 expect(parsed.simulation?.districtResults).toHaveLength(5);
 });
 it('posts the actual optimizer route and topN',async()=>{
 const fetch=vi.fn().mockResolvedValue(reply({simulation:wire,scenarios:[{...wire,selected_measures:toWirePlan(DEMO_PLAN).decisions}],recommended:{improvement:0,reasoning:null},aiStatus:{status:'configuration_error'}}));vi.stubGlobal('fetch',fetch);
 const result=await optimize(backendPlan,'backend');expect(result.recommended.score).toBe(wire.score);expect(result.aiStatus).toBe('configuration_error');expect(fetch.mock.calls[0][0]).toMatch(/\/ai\/optimize$/);expect(JSON.parse(fetch.mock.calls[0][1].body).topN).toBe(5);
 });
 it('loads catalog with the mandatory dataset version',async()=>{
 const category={transport:'TRANSPORT',green:'ECOLOGY',social:'SOCIAL',safety:'SAFETY',services:'SERVICES'};
 vi.stubGlobal('fetch',vi.fn((url:string)=>Promise.resolve(reply(url.endsWith('/health')?{status:'ok',simulation_engine:'available'}:url.endsWith('/bootstrap')?{datasetVersion:'sim-test',budget:100}:url.endsWith('/districts')?demoCityData.districts.map(d=>({name:d.id,population_share:d.share,indicators:d.indicators})):demoCityData.actions.map(a=>({...a,name:a.title,category:category[a.category],scope:a.scope.toUpperCase()}))))));
 const city=await loadCityData();expect(city.mode).toBe('backend');expect(city.datasetVersion).toBe('sim-test');expect(city.baseline).toBeNull();expect(city.actions).toHaveLength(14);
 });

 it('sends per-measure districts and no client scores',()=>expect(toWirePlan(DEMO_PLAN)).toEqual({decisions:[{measure_id:'M7',district:'NURA'},{measure_id:'M8',district:'NURA'},{measure_id:'M10',district:'NURA'},{measure_id:'M12'},{measure_id:'M5',district:'SARYARKA'}]}));
 it('rejects mixed districts rather than silently changing them',()=>expect(()=>toBackendPlan({...backendPlan,decisions:DEMO_PLAN})).toThrow('бір ортақ аудан'));
 it('requires dataset version',()=>expect(()=>toBackendPlan({decisions:DEMO_PLAN})).toThrow('нұсқасы'));
 it('renders exact server numbers',()=>expect(parseSimulation(wire)).toEqual(demoSimulation));
 it('rejects incomplete or legacy responses',()=>{expect(()=>parseSimulation({spent:95,projectedScore:56})).toThrow();expect(()=>parseSimulation({...wire,districts:{NURA:wire.districts.NURA}})).toThrow();});
 it('posts actual PlanIn to analyze and preserves simulation without AI',async()=>{const fetch=vi.fn().mockResolvedValue(reply({simulation:wire,analysis:null,aiStatus:{status:'configuration_error'}}));vi.stubGlobal('fetch',fetch);const result=await simulate(backendPlan,'backend');expect(result.projectedScore).toBe(wire.score);expect(result.analysis?.analysis).toBeNull();expect(fetch.mock.calls[0][0]).toMatch(/\/ai\/analyze$/);expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({datasetVersion:'sim-test',districtId:'NURA',actionIds:['M7','M8','M10','M12','M5']});});
 it.each([400,422])('shows validation for %s',async status=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply({detail:'budget exceeded'},status)));await expect(simulate(backendPlan,'backend')).rejects.toThrow('Бюджеттен');});
 it('handles missing routes',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply({},404)));await expect(optimize(backendPlan,'backend')).rejects.toThrow('/ai/optimize');});
 it('falls back on unavailable startup',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('offline')));const result=await loadCityData();expect(result.mode).toBe('demo');expect(result.fallbackReason).toContain('байланыс жоқ');expect(result.actions).toHaveLength(14);});
 it('does not hide cancellation with fallback',async()=>{const c=new AbortController();c.abort();vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new DOMException('Aborted','AbortError')));await expect(loadCityData(c.signal)).rejects.toThrow();});
 it('handles timeout without fabricated result',async()=>{vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn((_url,init)=>new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))));const task=expect(simulate(backendPlan,'backend')).rejects.toThrow('30 секунд');await vi.advanceTimersByTimeAsync(30001);await task;});
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
