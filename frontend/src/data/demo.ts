import {districtIds,districtNames,indicatorIds,type Action,type CityData,type Selection,type SimulationResult,type AnalysisResult,type OptimizationResult} from '../types';

// Static presentation fixtures. No simulation formula or optimizer runs here.
const indicators=(values:number[])=>Object.fromEntries(indicatorIds.map((id,i)=>[id,values[i]])) as Record<typeof indicatorIds[number],number>;
const initial=[ [45,62,68,72,48,55,78,60,75,70], [40,75,50,55,60,65,62,52,50,60], [50,70,42,40,62,68,58,55,45,55], [52,68,55,50,58,60,52,58,55,58], [55,40,45,65,38,35,55,50,60,50] ];
const scores=[62.99,57.06,54.65,56.63,49.18];
const shares=[.27,.24,.20,.13,.16];
const rows:Action[]=[
 {id:'M1',title:'Автобустарға арналған бөлек жолақтар',category:'transport',scope:'district',cost:18,lag:2,effects:{T1:6,T2:9}},
 {id:'M2',title:'Ақылды бағдаршамдар',category:'transport',scope:'city',cost:22,lag:2,effects:{T1:4,B2:3}},
 {id:'M3',title:'ЛРТ желісі / кеңейту',category:'transport',scope:'district',cost:30,lag:4,effects:{T1:16,T2:20,E2:4}},
 {id:'M4',title:'Саябақ / сквер',category:'green',scope:'district',cost:15,lag:2,effects:{E1:12,E2:3,B1:2}},
 {id:'M5',title:'Жеке секторды таза отынға көшіру',category:'green',scope:'district',cost:25,lag:3,effects:{E2:14,C1:4}},
 {id:'M6',title:'Қалалық көгалдандыру және желден қорғау белдеулері',category:'green',scope:'city',cost:20,lag:4,effects:{E1:5,E2:3}},
 {id:'M7',title:'Мектеп + балабақша',category:'social',scope:'district',cost:24,lag:3,effects:{S1:16}},
 {id:'M8',title:'Отбасылық денсаулық орталығы / емхана',category:'social',scope:'district',cost:20,lag:3,effects:{S2:14}},
 {id:'M9',title:'Аула спорт-хабтары',category:'social',scope:'district',cost:10,lag:1,effects:{S1:3,S2:3,B1:3}},
 {id:'M10',title:'Жарықтандыру және камералар (Safe City)',category:'safety',scope:'district',cost:12,lag:1,effects:{B1:12,B2:2}},
 {id:'M11',title:'Қауіпсіз өткелдер мен мектеп аймақтары',category:'safety',scope:'district',cost:10,lag:1,effects:{B2:12,T1:-2}},
 {id:'M12',title:'Бірыңғай цифрлық өтініштер платформасы',category:'services',scope:'city',cost:14,lag:1,effects:{C2:5}},
 {id:'M13',title:'Жылу және су желілерін жаңғырту',category:'services',scope:'district',cost:28,lag:4,effects:{C1:18,E2:2}},
 {id:'M14',title:'ТКШ авариялық бригадалары + ерте хабарлау',category:'services',scope:'city',cost:16,lag:1,effects:{C1:5,C2:2}},
];
export const DEMO_PLAN:Selection=[{actionId:'M7',districtId:'NURA'},{actionId:'M8',districtId:'NURA'},{actionId:'M10',districtId:'NURA'},{actionId:'M12',districtId:null},{actionId:'M5',districtId:'SARYARKA'}];
const zeros=[0,0,0,0,0,0,0,0,0,0];
const baseline:SimulationResult={spent:0,remaining:100,baselineScore:52.55768,projectedScore:52.55768,delta:0,cityAverage:56.8624,weakestDistrict:'NURA',criticalCount:2,districtResults:districtIds.map((id,i)=>({id,name:districtNames[id],beforeD:scores[i],afterD:scores[i],before:indicators(initial[i]),after:indicators(initial[i]),deltas:indicators(zeros)}))};
export const demoCityData:CityData={mode:'demo',budget:100,budgetUnit:'бірлік',baseline,actions:rows,districts:districtIds.map((id,i)=>({id,name:districtNames[id],description:'Демо каталог — синтетикалық деректер',share:shares[i],baselineD:scores[i],indicators:indicators(initial[i])}))};
const finals=[[45,62,68,72,48,55,78,60,75,74.375],[40,75,50,55,60,65,62,52,50,64.375],[50,70,42,48.75,62,68,58,55,47.5,59.375],[52,68,55,50,58,60,52,58,55,62.375],[55,40,45,65,48,43.75,67.5,51.75,60,54.375]];
const finalScores=[63.4275,57.4975,56.3,57.0675,52.9625];
const deltas=[[0,0,0,0,0,0,0,0,0,4.375],[0,0,0,0,0,0,0,0,0,4.375],[0,0,0,8.75,0,0,0,0,2.5,4.375],[0,0,0,0,0,0,0,0,0,4.375],[0,0,0,0,10,8.75,12.5,1.75,0,4.375]];
export const demoSimulation:SimulationResult={spent:95,remaining:5,baselineScore:52.55768,projectedScore:56.54307,delta:3.98539,cityAverage:58.0776,weakestDistrict:'NURA',criticalCount:0,districtResults:districtIds.map((id,i)=>({id,name:districtNames[id],beforeD:scores[i],afterD:finalScores[i],before:indicators(initial[i]),after:indicators(finals[i]),deltas:indicators(deltas[i])}))};
export function assertDemoPlan(selection:Selection){
 if(selection.length!==5||new Set(selection.map(d=>d.actionId)).size!==5||!selection.every(d=>DEMO_PLAN.some(p=>p.actionId===d.actionId&&p.districtId===d.districtId)))throw new Error('Демо нәтиже тек дайын үлгі сценарийге арналған. «Демо сценарийді жүктеу» батырмасын басыңыз немесе backend-ке қосылыңыз.');
}
export const demoAnalysis:AnalysisResult={status:'demo',message:'Дайын демо мәтін. AI сервисіне сұраным жіберілген жоқ.',analysis:{policy:{summary:'Үлгі жоспар Нұраның әлеуметтік инфрақұрылымына бағытталған.',strengths:['Мектеп пен емхана бір ауданда дамиды.'],tradeoffs:['Көлік шаралары бұл үлгіге кірмеген.'],district_observations:['Сарыарқада таза отынға көшу таңдалған.']},risk:{risk_level:'medium',risks:['Іске асыру мерзімі мен ресурстарды нақтылау қажет.'],critical_findings:['Үлгі нәтижеде критикалық көрсеткіш саны — 0.'],warnings:['Бұл нақты AI бағасы емес.']},optimizer:{current_score:56.54307,recommended_score:56.54307,improvement:0,recommended_scenario:DEMO_PLAN,reasoning:'Демо режимінде осы үлгі ғана көрсетіледі. Оңтайлы жоспар ізделген жоқ.'},executive:{executive_summary:'Үлгі сценарийдің бюджеті — 95 бірлік.',top_strengths:['5 бірлік резерв қалады.'],main_risks:['Барлық саланы бір бюджетпен қамту мүмкін емес.'],recommended_actions:['Нақты сценарийді backend арқылы салыстырыңыз.'],final_comment:'Бұл интерфейсті таныстыруға арналған дайын мәтін.'}}};
const summary={score:56.54307,cost:95,weakestDistrict:'NURA',criticalCount:0,decisions:DEMO_PLAN};
export const demoOptimization:OptimizationResult={current:summary,recommended:summary,improvement:0,costDelta:0,criticalDelta:0};
