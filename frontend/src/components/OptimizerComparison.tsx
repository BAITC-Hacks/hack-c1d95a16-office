import {LoaderCircle,TrendingUp} from 'lucide-react';
import {districtNames,type OptimizationResult,type SimulationResult} from '../types';
import {number} from '../lib/format';
import {DecisionList} from './AIAnalysisPanel';
export function OptimizerComparison({current,result,loading,error,onOptimize,demo}:{current:SimulationResult|null;result:OptimizationResult|null;loading:boolean;error:string|null;onOptimize:()=>void;demo:boolean}){
  return <section className="panel optimizer-panel" id="optimizer" aria-busy={loading}><div className="section-heading"><div><span className="step-label">05 · СЦЕНАРИЙЛЕРДІ САЛЫСТЫРУ</span><h2>Бюджетті тиімді бөлу</h2></div><button className="secondary-button" disabled={!current||loading} onClick={onOptimize}>{loading?<LoaderCircle className="spin" size={16}/>:<TrendingUp size={16}/>} {loading?'Ізделуде…':'Сценарийді оңтайландыру'}</button></div>
    {error&&<p role="alert" className="inline-error">{error}</p>}
    <div className="optimizer-grid">{[false,true].map(recommended=>{
      const value=recommended?result?.recommended:current?{score:current.projectedScore,cost:current.spent,weakestDistrict:current.weakestDistrict,criticalCount:current.criticalCount}:null;
      return <article className={`comparison-card ${recommended?'recommended':''}`} key={String(recommended)}><h3>{recommended?'AI ұсынған сценарий':'Сіздің сценарийіңіз'}</h3>{value?<><strong className="comparison-score">{number(value.score)} <small>Score</small></strong><dl><dt>Шығын</dt><dd>{number(value.cost)} / 100</dd><dt>Ең әлсіз аудан</dt><dd>{districtNames[value.weakestDistrict]}</dd><dt>Критикалық көрсеткіш</dt><dd>{value.criticalCount}</dd></dl>{recommended&&result&&<DecisionList decisions={result.recommended.decisions}/>}</>:<p className="muted">{recommended?'Оңтайландырудан кейін сервер ұсынған сценарий көрсетіледі.':'Алдымен симуляцияны іске қосыңыз.'}</p>}</article>;
    })}</div>
    {result&&<div className="comparison-delta"><strong>Score айырмасы: {result.improvement===null?'Сервер бермеді':`${result.improvement>0?'+':''}${number(result.improvement)}`}</strong><span>Шығын айырмасы: {result.costDelta===null?'Сервер бермеді':number(result.costDelta)}</span><span>Критикалық санының айырмасы: {result.criticalDelta===null?'Сервер бермеді':number(result.criticalDelta)}</span></div>}
    <p className="chart-note">{demo ? "Демо салыстыру бір үлгіні екі жақта көрсетеді. Нақты оңтайландыру орындалған жоқ." : "Ұсынысты сервердегі optimizer есептейді. Frontend сценарийді өздігінен есептемейді немесе өзгертпейді."}</p>
  </section>;
}
