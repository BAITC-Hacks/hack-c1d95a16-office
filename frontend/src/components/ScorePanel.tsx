import {BarChart3,ArrowRight,LoaderCircle} from 'lucide-react';
import {districtNames,indicatorIds,indicatorNames,type SimulationResult} from '../types';
import {number} from '../lib/format';
export function ScorePanel({result,baseline,loading,demo}:{result:SimulationResult|null;baseline:SimulationResult;loading:boolean;demo:boolean}){
  return <section className="panel score-panel" id="results" aria-busy={loading}>
    <div className="panel-heading"><span className="icon-box soft"><BarChart3 size={19}/></span><h3>Өмір сапасы</h3><span className="micro-label">SCORE</span></div>
    {result?<>
      <p className="result-source">{demo ? "Демо үлгінің дайын нәтижесі" : "Backend есебі"}</p>
      <div className="score-values"><div><span>Бастапқы</span><strong>{number(result.baselineScore)}</strong></div><ArrowRight size={20}/><div><span>Болжамды</span><strong className="projected" data-testid="projected-score">{number(result.projectedScore)}</strong></div></div>
      <div className="score-change">{result.delta>=0?'+':''}{number(result.delta)} ұпай өзгеріс</div>
      <div className="score-breakdown"><span>Қала орташа балы <strong>{number(result.cityAverage)}</strong></span><span>Ең әлсіз аудан <strong>{districtNames[result.weakestDistrict]}</strong></span><span>Критикалық көрсеткіш <strong>{result.criticalCount}</strong></span><span>Жалпы шығын <strong>{number(result.spent)}</strong></span><span>Қалған бюджет <strong>{number(result.remaining)}</strong></span></div>
      <h4>Аудандар: бұрын және кейін</h4><div className="comparison-chart"><div className="chart-legend"><span><i/>Бұрын</span><span><i/>Кейін</span></div>{result.districtResults.map(d=><div className="comparison-row" key={d.id}><div><span>{d.name} · {d.id}</span><small>{number(d.beforeD)} → {number(d.afterD)}</small></div><div className="comparison-bars" aria-hidden="true"><i style={{width:`${d.beforeD}%`}}/><i style={{width:`${d.afterD}%`}}/></div></div>)}<p className="chart-note">Ортақ 0–100 шкаласы. {demo ? "Демо үлгі мәндері." : "Барлық мән backend-тен алынған."}</p></div>
      {result.districtResults.map(d=><details className="district-result" key={d.id}><summary>{d.name} · көрсеткіштер өзгерісі</summary><table><thead><tr><th>Көрсеткіш</th><th>Бұрын</th><th>Кейін</th><th>Δ</th></tr></thead><tbody>{indicatorIds.map(k=><tr key={k} className={d.after[k]<40?'critical':''}><td title={indicatorNames[k]}>{k} · {indicatorNames[k]}</td><td>{number(d.before[k])}</td><td>{number(d.after[k])}</td><td>{d.deltas[k]>0?'+':''}{number(d.deltas[k])}</td></tr>)}</tbody></table></details>)}
    </>:<div className="empty-score"><span className="score-placeholder">{number(baseline.baselineScore)}</span><strong>{loading?'Сервер есептеп жатыр…':demo ? 'Бастапқы Score · демо' : 'Бастапқы Score · Backend'}</strong><p>Тура 5 шара таңдап, симуляцияны іске қосыңыз.</p>{loading&&<LoaderCircle className="spin" size={18}/>}</div>}
  </section>;
}
