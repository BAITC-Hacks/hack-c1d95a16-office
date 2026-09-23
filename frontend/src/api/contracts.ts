import {z} from 'zod';
import {districtIds,districtNames,indicatorIds,type Action,type CityData,type SimulationResult,type AnalysisResult,type Selection,type OptimizationResult} from '../types';

const n=z.number().finite(),count=n.int().nonnegative();
const indicators=z.record(z.enum(indicatorIds),n.min(0).max(100));
const deltaIndicators=z.record(z.enum(indicatorIds),n);
const decisionSchema=z.object({measure_id:z.string().min(1),district:z.enum(districtIds).nullable().optional()});
const decisionsSchema=z.array(decisionSchema);
const toDecisions=(rows:z.infer<typeof decisionsSchema>):Selection=>rows.map(d=>({actionId:d.measure_id,districtId:d.district??null}));
const districtResultSchema=z.object({initial_score:n,final_score:n,initial_indicators:indicators,final_indicators:indicators,indicator_deltas:deltaIndicators});
// Matches simulation/engine.py output. Incomplete legacy single-district views
// are intentionally rejected instead of supplying invented defaults.
export const engineResultSchema=z.object({
  valid:z.literal(true),total_cost:n.nonnegative(),remaining_budget:n.nonnegative(),score:n,baseline_score:n,score_delta:n,
  city_average:n,weakest_district:z.enum(districtIds),critical_count:count,
  districts:z.record(z.enum(districtIds),districtResultSchema),
});
export function parseSimulation(raw:unknown):SimulationResult {
  const r=engineResultSchema.parse(raw);
  return {spent:r.total_cost,remaining:r.remaining_budget,baselineScore:r.baseline_score,projectedScore:r.score,delta:r.score_delta,cityAverage:r.city_average,weakestDistrict:r.weakest_district,criticalCount:r.critical_count,
    districtResults:districtIds.map(id=>({id,name:districtNames[id],beforeD:r.districts[id].initial_score,afterD:r.districts[id].final_score,before:r.districts[id].initial_indicators,after:r.districts[id].final_indicators,deltas:r.districts[id].indicator_deltas}))};
}
const districtCatalogSchema=z.array(z.object({name:z.enum(districtIds),population_share:n.positive().max(1),indicators}));
const measureCatalogSchema=z.array(z.object({id:z.string().min(1),name:z.string().min(1),category:z.enum(['TRANSPORT','ECOLOGY','SOCIAL','SAFETY','SERVICES']),scope:z.enum(['DISTRICT','CITY']),cost:n.nonnegative(),lag:count,effects:z.partialRecord(z.enum(indicatorIds),n)}));
const categoryMap={TRANSPORT:'transport',ECOLOGY:'green',SOCIAL:'social',SAFETY:'safety',SERVICES:'services'} as const;
// Labels only: costs, scopes, effects and all numerical values come from API.
const titles:Record<string,string>={M1:'Автобустарға арналған бөлек жолақтар',M2:'Ақылды бағдаршамдар',M3:'ЛРТ желісі / кеңейту',M4:'Саябақ / сквер',M5:'Жеке секторды таза отынға көшіру',M6:'Қалалық көгалдандыру және желден қорғау белдеулері',M7:'Мектеп + балабақша',M8:'Отбасылық денсаулық орталығы / емхана',M9:'Аула спорт-хабтары',M10:'Жарықтандыру және камералар (Safe City)',M11:'Қауіпсіз өткелдер мен мектеп аймақтары',M12:'Бірыңғай цифрлық өтініштер платформасы',M13:'Жылу және су желілерін жаңғырту',M14:'ТКШ авариялық бригадалары + ерте хабарлау'};
export function parseCityData(districtRaw:unknown,measureRaw:unknown,baselineRaw:unknown, datasetVersion?:string):CityData {
  const districts=districtCatalogSchema.parse(districtRaw),measures=measureCatalogSchema.parse(measureRaw),baseline=baselineRaw===null?null:parseSimulation(baselineRaw);
  if(districts.length!==5||new Set(districts.map(d=>d.name)).size!==5) throw new Error('Сервер барлық бес ауданның дерегін қайтаруы керек.');
  if(new Set(measures.map(m=>m.id)).size!==measures.length) throw new Error('Сервер каталогында шара ID-лері қайталанады.');
  if(baseline&&(baseline.spent!==0||baseline.remaining!==100)) throw new Error('Бастапқы бюджет 100, шығын 0 болуы керек.');
  return {mode:'backend',datasetVersion,budget:baseline?.remaining??100,budgetUnit:'бірлік',baseline,
    districts:districtIds.map(id=>{const d=districts.find(d=>d.name===id)!;return {id,name:districtNames[id],description:'Backend қайтарған бастапқы жағдай',share:d.population_share,baselineD:baseline?.districtResults.find(d=>d.id===id)?.beforeD??null,indicators:d.indicators};}),
    actions:measures.map((m):Action=>({id:m.id,title:titles[m.id]??m.name,category:categoryMap[m.category],scope:m.scope==='CITY'?'city':'district',cost:m.cost,lag:m.lag,effects:m.effects}))};
}
const strings=z.array(z.string());
const councilSchema=z.object({
  policy:z.object({summary:z.string(),strengths:strings,tradeoffs:strings,district_observations:strings}),
  risk:z.object({risk_level:z.enum(['low','medium','high']),risks:strings,critical_findings:strings,warnings:strings}),
  optimizer:z.object({current_score:n,recommended_score:n,improvement:n,recommended_scenario:decisionsSchema,reasoning:z.string().nullable()}),
  executive:z.object({executive_summary:z.string(),top_strengths:strings,main_risks:strings,recommended_actions:strings,final_comment:z.string()}),
});
export function parseAnalysis(raw:unknown):AnalysisResult {
  const r=z.object({simulation:engineResultSchema.optional(),analysis:councilSchema.nullable(),aiStatus:z.object({status:z.string(),message:z.string().optional()})}).parse(raw);
  return {simulation:r.simulation?parseSimulation(r.simulation):undefined,analysis:r.analysis?{...r.analysis,optimizer:{...r.analysis.optimizer,recommended_scenario:toDecisions(r.analysis.optimizer.recommended_scenario)}}:null,status:r.aiStatus.status,message:r.aiStatus.status==='configuration_error'?'AI сервисі серверде бапталмаған. Member 2-ге хабарласыңыз.':r.analysis?null:'AI сервисі қазір жауап бере алмады. Кейін қайта сұратыңыз.'};
}
const summarySchema=z.object({score:n,total_cost:n.nonnegative(),weakest_district:z.enum(districtIds),critical_count:count,selected_measures:decisionsSchema.optional(),decisions:decisionsSchema.optional()});
const summary=(raw:unknown)=>{const r=summarySchema.parse(raw);return {score:r.score,cost:r.total_cost,weakestDistrict:r.weakest_district,criticalCount:r.critical_count,decisions:toDecisions(r.selected_measures??r.decisions??[])};};
export function parseOptimization(raw:unknown):OptimizationResult {
  const r=z.object({simulation:summarySchema,scenarios:z.array(summarySchema).min(1),recommended:z.object({improvement:n,reasoning:z.string().nullable().optional()}),aiStatus:z.object({status:z.string()}).optional(),comparison:z.object({total_cost_delta:n,critical_count_delta:n}).optional()}).parse(raw);
  return {current:summary(r.simulation),recommended:summary(r.scenarios[0]),improvement:r.recommended.improvement,costDelta:r.comparison?.total_cost_delta??null,criticalDelta:r.comparison?.critical_count_delta??null,reasoning:r.recommended.reasoning??null,aiStatus:r.aiStatus?.status};
}
export const toWirePlan=(selection:Selection)=>({decisions:selection.map(d=>({measure_id:d.actionId,...(d.districtId?{district:d.districtId}:{})}))});
