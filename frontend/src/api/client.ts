import {z} from 'zod';
import {parseAnalysis,parseCityData,parseOptimization} from './contracts';
import {assertDemoPlan,demoCityData,demoSimulation,demoAnalysis,demoOptimization} from '../data/demo';
import type {Plan} from '../types';

export const API_BASE_URL=import.meta.env.VITE_API_BASE_URL?.trim()||'http://localhost:8000';
const TIMEOUT_MS=30000;
function validationMessage(raw:unknown):string {
  const text=JSON.stringify(raw).toLowerCase();
  if(/budget|бюджет|total_cost/.test(text)) return 'Бюджеттен асып кетті. Шараларды өзгертіп, қайта жіберіңіз.';
  if(/exactly|five|5 decisions|decision.*count/.test(text)) return 'Симуляция үшін тура 5 шешім қажет.';
  if(/conflict|incompatib|конфликт/.test(text)) return 'Таңдалған шаралар өзара үйлеспейді. Шаралар мен аудандарды тексеріңіз.';
  if(/duplicate|repeat/.test(text)) return 'Бір шараны қайталап таңдауға болмайды.';
  return 'Сценарий қабылданбады. Бес шешім, аудан, бюджет және конфликт ережелерін тексеріңіз.';
}
async function request(path:string,body:unknown|undefined,signal?:AbortSignal):Promise<unknown>{
  const controller=new AbortController();let timedOut=false;
  const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)controller.abort();
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},TIMEOUT_MS);
  try{
    const response=await fetch(`${API_BASE_URL.replace(/\/$/,'')}${path}`,{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
    const raw:unknown=await response.json().catch(()=>null);
    if(!response.ok){
      if(response.status===422||response.status===400) throw new Error(validationMessage(raw));
      if(response.status===404) throw new Error(`${path} маршруты backend-те табылмады. Сервердің жаңа нұсқасын қосыңыз.`);
      if(response.status===409) throw new Error('Датасет жаңарған. Бастапқы деректерді қайта жүктеңіз.');
      if(response.status===429) throw new Error('Сұраным шегіне жетті. Біраздан кейін қайталаңыз.');
      if(response.status===503) throw new Error('Backend немесе есептеу қозғалтқышы уақытша қолжетімсіз.');
      throw new Error(`Сервер қатесі (${response.status}). Қайта сұратып көріңіз.`);
    }
    if(raw&&typeof raw==='object'&&'valid' in raw&&raw.valid===false)throw new Error(validationMessage(raw));
    return raw;
  }catch(error){
    if(timedOut) throw new Error('Сервер 30 секунд ішінде жауап бермеді. Қайта сұратыңыз.');
    if(error instanceof TypeError)throw new Error('Backend-пен байланыс жоқ. Сервердің іске қосылғанын, API адресін және CORS баптауын тексеріңіз.');
    throw error;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
function parse<T>(fn:()=>T):T{try{return fn();}catch(e){if(e instanceof z.ZodError)throw new Error('Backend жауабы толық API келісіміне сәйкес емес. Member 2-мен JSON құрылымын тексеріңіз.');throw e;}}
export async function loadCityData(signal?:AbortSignal){
  try {
  const health=await request('/health',undefined,signal);
  const h=z.object({status:z.string(),simulation_engine:z.string().optional()}).safeParse(health);
  if(!h.success||h.data.simulation_engine==='unavailable')throw new Error('Есептеу қозғалтқышы қолжетімсіз. Backend пен simulation интеграциясы қажет.');
  const [districts,measures,bootstrap]=await Promise.all(['/districts','/measures','/bootstrap'].map(path=>request(path,undefined,signal)));
  const boot=parse(()=>z.object({datasetVersion:z.string().min(1),budget:z.literal(100)}).parse(bootstrap));
  return parse(()=>parseCityData(districts,measures,null,boot.datasetVersion));
  } catch(error) { if(signal?.aborted) throw error; return structuredClone({...demoCityData,fallbackReason:error instanceof Error?error.message:'Backend қолжетімсіз.'}); }
}
// backend/schemas.py PlanIn: one common district, no client-computed values.
export function toBackendPlan(plan:Plan){
  if(!plan.datasetVersion)throw new Error('Каталог нұсқасы жоқ. Backend деректерін қайта жүктеңіз.');
  const districts=[...new Set(plan.decisions.flatMap(d=>d.districtId?[d.districtId]:[]))];
  if(districts.length!==1)throw new Error('Қазіргі backend келісімі бір ортақ аудан талап етеді. Аудандық шараларға бір аудан таңдаңыз.');
  return {datasetVersion:plan.datasetVersion,districtId:districts[0],actionIds:plan.decisions.map(d=>d.actionId)};
}
export async function simulate(plan:Plan,mode:'demo'|'backend',signal?:AbortSignal){
  if(mode==='demo'){assertDemoPlan(plan.decisions);return structuredClone(demoSimulation);}
  // /simulate's compact view omits district scores and aggregate metrics.
  // /ai/analyze returns the full authoritative simulation even without an AI key.
  const analysis=await analyze(plan,mode,signal);
  if(!analysis.simulation)throw new Error('Backend толық симуляция нәтижесін қайтармады.');
  return {...analysis.simulation,analysis};
}
export async function analyze(plan:Plan,mode:'demo'|'backend',signal?:AbortSignal){
  if(mode==='demo'){assertDemoPlan(plan.decisions);return structuredClone({...demoAnalysis,simulation:demoSimulation});}
  const raw=await request('/ai/analyze',toBackendPlan(plan),signal);return parse(()=>parseAnalysis(raw));
}
export async function optimize(plan:Plan,mode:'demo'|'backend',signal?:AbortSignal){
  if(mode==='demo'){assertDemoPlan(plan.decisions);return structuredClone(demoOptimization);}
  const raw=await request('/ai/optimize',{...toBackendPlan(plan),topN:5},signal);return parse(()=>parseOptimization(raw));
}
