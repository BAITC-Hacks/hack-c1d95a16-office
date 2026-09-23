export const categoryIds=['transport','green','social','safety','services'] as const;
export type CategoryId=typeof categoryIds[number];
export const categories:{id:CategoryId;name:string;description:string}[]=[
  {id:'transport',name:'Көлік',description:'Жолдар мен қоғамдық көлік'},
  {id:'green',name:'Экология',description:'Көгалдандыру және таза ауа'},
  {id:'social',name:'Әлеуметтік сала',description:'Білім беру және денсаулық'},
  {id:'safety',name:'Қауіпсіздік',description:'Көше мен жол қауіпсіздігі'},
  {id:'services',name:'Қалалық сервистер',description:'ТКШ және тұрғындар өтініштері'},
];
export const districtIds=['ESIL','ALMATY','SARYARKA','BAIKONUR','NURA'] as const;
export const districtNames:Record<string,string>={ESIL:'Есіл',ALMATY:'Алматы',SARYARKA:'Сарыарқа',BAIKONUR:'Байқоңыр',NURA:'Нұра'};
export const indicatorIds=['T1','T2','E1','E2','S1','S2','B1','B2','C1','C2'] as const;
export type IndicatorId=typeof indicatorIds[number];
export const indicatorNames:Record<IndicatorId,string>={T1:'Жолдардың бос болуы',T2:'Қоғамдық көлік қолжетімділігі',E1:'Көгалдандыру',E2:'Ауа сапасы',S1:'Мектептер мен балабақшалар',S2:'Алғашқы медициналық көмек',B1:'Көше қауіпсіздігі',B2:'Жол қозғалысының қауіпсіздігі',C1:'ТКШ сенімділігі',C2:'Өтініштерді шешу жылдамдығы'};
export interface Action {id:string;category:CategoryId;title:string;scope:'district'|'city';cost:number;lag:number;effects:Partial<Record<IndicatorId,number>>}
export interface District {id:string;name:string;description:string;share:number;baselineD:number;indicators:Record<IndicatorId,number>}
export interface Decision {actionId:string;districtId:string|null}
export type Selection=Decision[];
export interface Plan {decisions:Selection}
export interface DistrictResult {id:string;name:string;beforeD:number;afterD:number;before:Record<IndicatorId,number>;after:Record<IndicatorId,number>;deltas:Record<IndicatorId,number>}
export interface SimulationResult {spent:number;remaining:number;baselineScore:number;projectedScore:number;delta:number;cityAverage:number;weakestDistrict:string;criticalCount:number;districtResults:DistrictResult[]}
export interface CityData {mode:'demo'|'backend';fallbackReason?:string;budget:number;budgetUnit:string;districts:District[];actions:Action[];baseline:SimulationResult}
export interface Council {
  policy:{summary:string;strengths:string[];tradeoffs:string[];district_observations:string[]};
  risk:{risk_level:string;risks:string[];critical_findings:string[];warnings:string[]};
  optimizer:{current_score:number;recommended_score:number;improvement:number;recommended_scenario:Selection;reasoning:string|null};
  executive:{executive_summary:string;top_strengths:string[];main_risks:string[];recommended_actions:string[];final_comment:string};
}
export interface AnalysisResult {analysis:Council|null;status:string;message:string|null}
export interface ScenarioSummary {score:number;cost:number;weakestDistrict:string;criticalCount:number;decisions:Selection}
export interface OptimizationResult {current:ScenarioSummary;recommended:ScenarioSummary;improvement:number|null;costDelta:number|null;criticalDelta:number|null}
