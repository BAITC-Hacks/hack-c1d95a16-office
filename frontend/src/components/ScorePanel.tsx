import { BarChart3, TrendingUp, CircleHelp, ArrowRight, LoaderCircle } from 'lucide-react';
import type { SimulationResult } from '../types';
import { number } from '../lib/format';

export function ScorePanel({ result, connected, loading }: { result: SimulationResult | null; connected: boolean; loading: boolean }) {
  return <section className="panel score-panel" id="results" aria-busy={loading}>
    <div className="panel-heading"><span className="icon-box soft"><BarChart3 size={19}/></span><h3>Өмір сапасы</h3><span className="micro-label">SCORE</span></div>
    {result ? <>
      <div className="score-values"><div><span>Бастапқы</span><strong>{number(result.baselineScore)}</strong></div><ArrowRight size={20}/><div><span>Болжамды</span><strong className="projected">{number(result.projectedScore)}</strong></div></div>
      <div className="score-change"><TrendingUp size={16}/>{result.projectedScore - result.baselineScore > 0 ? '+' : ''}{number(result.projectedScore - result.baselineScore)} ұпай өзгеріс</div>
      {result.metrics.length > 0 && <div className="comparison-chart"><div className="chart-legend"><span><i/>Бұрын</span><span><i/>Кейін</span></div>{result.metrics.map(metric => {
        const scale = Math.max(Math.abs(metric.before), Math.abs(metric.after), 1);
        return <div className="comparison-row" key={metric.label}><div><span>{metric.label}</span><small>{number(metric.before)} → {number(metric.after)} {metric.unit}</small></div>
          <div className="comparison-bars" aria-hidden="true"><i style={{ width: `${Math.abs(metric.before) / scale * 100}%` }}/><i style={{ width: `${Math.abs(metric.after) / scale * 100}%` }}/></div></div>;
      })}<p className="chart-note">Әр қатардың масштабы бөлек. Сандық мәндер — backend нәтижесі.</p></div>}
      {result.assumptions.length > 0 && <details className="assumptions"><summary>Модель болжамдары</summary><ul>{result.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul></details>}
    </> : <div className="empty-score"><span className="score-placeholder">— <span>/</span> —</span><strong>{loading ? 'Сценарий есептеліп жатыр' : connected ? 'Сценарий нәтижесін күтеміз' : 'Есептеу сервисі қосылмаған'}</strong><p>{connected ? 'Бес шешімді таңдағаннан кейін нәтижені есептеңіз.' : 'Сервис қосылғанда бастапқы және болжамды көрсеткіштер осында көрінеді.'}</p>{loading ? <LoaderCircle className="spin" size={18}/> : <CircleHelp size={17}/>}</div>}
  </section>;
}
