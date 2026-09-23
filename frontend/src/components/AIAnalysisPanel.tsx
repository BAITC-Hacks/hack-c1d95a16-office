import { Sparkles, ArrowUpRight, LoaderCircle, RefreshCw } from 'lucide-react';
import type { AnalysisResult } from '../types';

export function AIAnalysisPanel({ analysis, loading, error, available, onAnalyze }: {
  analysis: AnalysisResult | null; loading: boolean; error: string | null; available: boolean; onAnalyze: () => void;
}) {
  return <section className="panel ai-panel" aria-busy={loading}>
    <div className="panel-heading"><span className="icon-box ai-icon"><Sparkles size={19}/></span><h3>AI кеңесші</h3><span className="ai-label">ТАЛДАУ</span></div>
    {analysis ? <div className="analysis-content"><p>{analysis.summary}</p>{[
      ['Жақсы жақтары', analysis.strengths], ['Тәуекелдер', analysis.risks], ['Ұсыныстар', analysis.recommendations],
    ].map(([label, values]) => <div key={label as string}><h4>{label as string}</h4><ul>{(values as string[]).map((value, i) => <li key={i}>{value}</li>)}</ul></div>)}</div>
    : <div className="ai-empty"><div className="ai-orbit" aria-hidden="true"><Sparkles size={25}/></div><strong>{loading ? 'Шешімдер талданып жатыр' : 'Әр шешімнің артында — әсер'}</strong><p>{loading ? 'AI есептелген нәтижелерге сүйенген түсіндірме дайындауда.' : 'Нақты талдау қосылғанда таңдауларыңыздың пайдалы жақтары, тәуекелдері мен салдары көрсетіледі.'}</p></div>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    <button type="button" className="ai-button" onClick={onAnalyze} disabled={!available || loading}>
      {loading ? <LoaderCircle className="spin" size={16}/> : error ? <RefreshCw size={16}/> : <Sparkles size={16}/>}
      {loading ? 'Талдау дайындалуда…' : error ? 'Қайта сұрату' : analysis ? 'Талдауды жаңарту' : 'AI талдауын алу'}<ArrowUpRight size={16}/>
    </button>
    {!available && <p className="service-note">Backend есебі мен AI байланысы қажет</p>}
  </section>;
}
