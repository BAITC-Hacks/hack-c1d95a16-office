import {type Action,type CityData,type Decision,type Selection} from '../types';
export const selectedActions=(selection:Selection,actions:Action[])=>selection.flatMap(d=>{const a=actions.find(x=>x.id===d.actionId);return a?[a]:[];});
export const totalCost=(selection:Selection,actions:Action[])=>selectedActions(selection,actions).reduce((s,a)=>s+a.cost,0);
export function validateSelection(selection:Selection,data:CityData,final=false):string[]{
  const errors:string[]=[];
  if(selection.length>5||(final&&selection.length!==5)) errors.push('Тура 5 шешім таңдалуы керек.');
  const ids=selection.map(d=>d.actionId);
  if(new Set(ids).size!==ids.length) errors.push('Әр шараны тек бір рет таңдауға болады.');
  const counts:Record<string,number>={};
  for(const d of selection){
    const a=data.actions.find(a=>a.id===d.actionId);
    if(!a){errors.push(`Белгісіз шара: ${d.actionId}.`);continue;}
    counts[a.category]=(counts[a.category]??0)+1;
    if(a.scope==='district'&&!data.districts.some(x=>x.id===d.districtId)) errors.push(`${a.id}: аудан міндетті түрде таңдалуы керек.`);
    if(a.scope==='city'&&d.districtId!==null) errors.push(`${a.id}: қалалық шара үшін аудан көрсетілмейді.`);
  }
  if(Object.values(counts).some(n=>n>2)) errors.push('Бір бағыттан ең көбі 2 шара таңдауға болады.');
  if(totalCost(selection,data.actions)>Math.min(100,data.budget)) errors.push('100 бірлік бюджеттен асуға болмайды.');
  if(ids.includes('M1')&&ids.includes('M3')) errors.push('M1 және M3 кез келген ауданда өзара үйлеспейді.');
  for(const [a,b] of [['M4','M7'],['M5','M13']]){
    const first=selection.find(d=>d.actionId===a),second=selection.find(d=>d.actionId===b);
    if(first?.districtId&&first.districtId===second?.districtId) errors.push(`${a} және ${b} бір ауданда қатар таңдалмайды.`);
  }
  return errors;
}
export function upsertDecision(selection:Selection,decision:Decision):Selection{
  return selection.some(d=>d.actionId===decision.actionId)?selection.map(d=>d.actionId===decision.actionId?decision:d):[...selection,decision];
}
