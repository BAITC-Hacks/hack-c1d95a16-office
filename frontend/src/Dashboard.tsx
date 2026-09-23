import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Building2, Check, CheckCircle2, CircleHelp, Compass, LayoutDashboard, Leaf, LoaderCircle, Map, RefreshCw, RotateCcw, Sparkles, X, AlertCircle, ChevronRight } from 'lucide-react';
import { BudgetBar } from './components/BudgetBar';
import { DistrictCards } from './components/DistrictCards';
import { DecisionSelector } from './components/DecisionSelector';
import { ScorePanel } from './components/ScorePanel';
import { AIAnalysisPanel } from './components/AIAnalysisPanel';
import { OptimizerComparison } from './components/OptimizerComparison';
import { DEMO_PLAN } from './data/demo';
import { categoryIcons } from './components/icons';
import { analyze, optimize, loadCityData, simulate } from './api/client';
import { selectedActions, totalCost, upsertDecision, validateSelection } from './lib/budget';
import { categories, type Decision, type AnalysisResult, type CategoryId, type CityData, type Selection, type SimulationResult, type OptimizationResult } from './types';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Күтпеген қате шықты. Қайталап көріңіз.';

export function Dashboard() {
  const [data, setData] = useState<CityData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [districtId, setDistrictId] = useState('');
  const [selection, setSelection] = useState<Selection>([]);
  const [expanded, setExpanded] = useState<CategoryId | null>('transport');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);
  const optimizationRequest = useRef<AbortController | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [nav, setNav] = useState('overview');
  const generation = useRef(0);
  const simulationRequest = useRef<AbortController | null>(null);
  const analysisRequest = useRef<AbortController | null>(null);
  const help = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    invalidate(); setSelection([]); setLoading(true); setLoadError(null); setData(null);
    loadCityData(controller.signal).then(city => {
      if (controller.signal.aborted) return;
      setData(city); setDistrictId(city.districts[0]?.id ?? ''); setLoading(false);
    }).catch(error => {
      if (!controller.signal.aborted) { setLoadError(errorMessage(error)); setLoading(false); }
    });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => () => { simulationRequest.current?.abort(); analysisRequest.current?.abort(); optimizationRequest.current?.abort(); }, []);

  const chosen = data ? selectedActions(selection, data.actions) : [];
  const spent = data ? totalCost(selection, data.actions) : 0;
  const complete = !!data && validateSelection(selection, data, true).length === 0;
  const [resetVersion, setResetVersion] = useState(0);

  function invalidate() {
    generation.current += 1;
    simulationRequest.current?.abort(); analysisRequest.current?.abort(); optimizationRequest.current?.abort();
    setSimulating(false); setAnalyzing(false); setResult(null); setAnalysis(null);
    setSimulationError(null); setAnalysisError(null); setOptimization(null); setOptimizationError(null); setOptimizing(false);
  }
  function reset() {
    invalidate(); setSelection([]); setDistrictId(data?.districts[0]?.id ?? '');
    setExpanded('transport'); setResetVersion(v => v + 1); setNotice('Сценарий бастапқы күйге қайтарылды.');
  }
  function selectDistrict(id: string) { setDistrictId(id); }
  function selectAction(decision: Decision) {
    if (!data) return;
    const next = upsertDecision(selection, decision);
    const errors = validateSelection(next, data);
    if (errors.length) { setNotice(errors.join(' ')); return; }
    invalidate(); setSelection(next); setNotice(`${decision.actionId} таңдауы сақталды.`);
  }
  function removeAction(id: string) {
    invalidate(); setSelection(selection.filter(d => d.actionId !== id));
    setNotice('Шара алынып тасталды. Бюджет жаңартылды.');
  }
  async function calculate() {
    if (!data || !complete || spent > data.budget) return;
    invalidate(); const current = generation.current;
    const controller = new AbortController(); simulationRequest.current = controller; setSimulating(true);
    try {
      const next = await simulate({ decisions: selection }, data.mode, controller.signal);
      if (current !== generation.current || controller.signal.aborted) return;
      if (next.spent > data.budget || Math.abs(next.spent + next.remaining - data.budget) > 0.000001) {
        throw new Error('Backend қайтарған бюджет бастапқы бюджетпен сәйкес емес.');
      }
      setResult(next); setNotice(data.mode === 'demo' ? 'Үлгі сценарийдің демо нәтижесі көрсетілді.' : 'Backend есебі дайын.');
    } catch (error) {
      if (current === generation.current && !controller.signal.aborted) setSimulationError(errorMessage(error));
    } finally { if (current === generation.current) setSimulating(false); }
  }
  async function requestAnalysis() {
    if (!data || !result || analyzing) return;
    const current = generation.current;
    analysisRequest.current?.abort(); const controller = new AbortController(); analysisRequest.current = controller;
    setAnalyzing(true); setAnalysisError(null);
    try {
      const next = await analyze({ decisions: selection }, data.mode, controller.signal);
      if (current === generation.current && !controller.signal.aborted) setAnalysis(next);
    } catch (error) {
      if (current === generation.current && !controller.signal.aborted) setAnalysisError(errorMessage(error));
    } finally { if (current === generation.current) setAnalyzing(false); }
  }
  async function requestOptimization() {
    if (!data || !result || optimizing) return;
    const current = generation.current;
    const controller = new AbortController(); optimizationRequest.current = controller;
    setOptimizing(true); setOptimizationError(null); setOptimization(null);
    try {
      const next = await optimize({ decisions: selection }, data.mode, controller.signal);
      if (current === generation.current && !controller.signal.aborted) setOptimization(next);
    } catch (error) {
      if (current === generation.current && !controller.signal.aborted) setOptimizationError(errorMessage(error));
    } finally { if (current === generation.current) setOptimizing(false); }
  }
  function loadExample() {
    invalidate(); setSelection(DEMO_PLAN.map(d => ({ ...d }))); setResetVersion(v => v + 1);
    setNotice('Демо үлгі сценарийі таңдалды.');
  }
  function navigate(id: string) {
    setNav(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main">Негізгі мазмұнға өту</a>
    <aside className="sidebar">
      <a href="#overview" className="brand" onClick={() => navigate('overview')} aria-label="QALA басты бет"><span className="brand-symbol"><Building2 size={24}/></span><span>QALA<span className="brand-dot">.</span></span></a>
      <div className="sidebar-caption">ҚАЛАНЫ БІРГЕ ҚҰРАМЫЗ</div>
      <nav aria-label="Басты навигация">
        {[{ id: 'overview', label: 'Басқару панелі', icon: LayoutDashboard }, { id: 'districts', label: 'Қала аудандары', icon: Map }, { id: 'decisions', label: 'Менің шешімдерім', icon: Compass }, { id: 'results', label: 'Нәтиже мен талдау', icon: Sparkles }].map(item => <button type="button" key={item.id} className={`nav-item ${nav === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)} aria-label={item.label} aria-current={nav === item.id ? 'location' : undefined}><item.icon size={18}/><span>{item.label}</span>{nav === item.id && <span className="nav-dot"/>}</button>)}
      </nav>
      <div className="sidebar-note"><span className="note-leaf"><Leaf size={23}/></span><h3>Бүгінгі шешім.<br/>Ертеңгі қала.</h3><p>Әр бағытқа назар аударып, ортақ болашаққа үлес қосыңыз.</p><span className="note-line"/><small>5 САҒАТҚА ӘКІМ</small></div>
      <button type="button" className="sidebar-help" onClick={() => help.current?.showModal()}><CircleHelp size={17}/>Симулятор туралы<ArrowUpRight size={15}/></button>
      <div className="sidebar-footer"><span className="event-mark">H</span><div><strong>HackAlem AI</strong><span>Astana Innovations трегі</span></div></div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><Building2 size={15}/><span>Астана</span><ChevronRight size={13}/><strong>Қала симуляторы</strong></div><div className="topbar-right"><span className={`mode-badge live`}><CheckCircle2 size={13}/>{data?.mode === 'demo' ? 'Демо режимі' : data ? 'Backend қосылған' : 'Байланыс күтілуде'}</span><span className="language-label">ҚАЗ</span><span className="avatar" aria-label="Әкім рөлі">Ә</span></div></header>
      <main id="main">
        <section className="page-intro" id="overview"><div><div className="intro-kicker"><span/> ҚАЛАНЫ БАСҚАРУ СИМУЛЯТОРЫ</div><h1>QALA — <em>«5 сағатқа әкім»</em></h1><p>Бір бюджет. Бес шешім. Ортақ болашақ.</p></div><button type="button" className="secondary-button" onClick={reset} disabled={!data || loading}><RotateCcw size={16}/>Қайта бастау</button></section>

        {loading ? <div className="loading-state" role="status"><LoaderCircle className="spin" size={26}/><h2>Қала деректері жүктелуде</h2><p>Бастапқы жағдай мен шаралар дайындалуда.</p><div className="skeleton-row"><i/><i/><i/></div></div>
        : loadError ? <div className="state-card" role="alert"><AlertCircle size={30}/><h2>Деректер жүктелмеді</h2><p>{loadError}</p><button className="primary-button" onClick={() => setReload(v => v + 1)}><RefreshCw size={16}/>Қайта жүктеу</button></div>
        : data && (data.districts.length === 0 || data.actions.length === 0) ? <div className="state-card"><Map size={30}/><h2>Қала деректері әлі жоқ</h2><p>Backend аудан мен шаралар тізімін қайтарғанда, сценарий құруға болады.</p><button className="secondary-button" onClick={() => setReload(v => v + 1)}><RefreshCw size={16}/>Қайта жүктеу</button></div>
        : data && <>
          <BudgetBar budget={data.budget} spent={spent} unit={data.budgetUnit}/>
          <div className="demo-notice"><CheckCircle2 size={16}/><div><p><strong>{data.mode === 'demo' ? 'Демо режимі.' : 'Backend деректері.'}</strong> {data.mode === 'demo' ? 'Каталог пен нәтижелер — дайын үлгілер. Бұл сіздің еркін таңдауыңыздың нақты есебі емес.' : 'Каталог, бастапқы жағдай және нәтижелер серверден алынады.'}</p>{data.fallbackReason && <p>{data.fallbackReason}</p>}</div></div>
          <div className="connection-actions"><button className="secondary-button" onClick={() => setReload(v => v + 1)}><RefreshCw size={15}/>Backend-ке қайта қосылу</button>{data.mode === 'demo' && <button className="primary-button" onClick={loadExample}>Демо сценарийді жүктеу</button>}<span className="header-count">Шешімдер: {selection.length} / 5</span></div>
          <DistrictCards districts={data.districts} selectedId={districtId} onSelect={selectDistrict}/>

          <div className="workspace-grid">
            <section id="decisions" className="decisions-section"><div className="section-heading"><div><span className="step-label">02 · СЕНІҢ ЖОСПАРЫҢ</span><h2>14 шарадан 5 шешім.</h2></div><span className={`count-badge ${complete ? 'done' : ''}`}>{complete && <Check size={13}/>}<span data-testid="decision-count">{chosen.length}</span> / 5</span></div>
              <p className="section-description">Тура 5 шара · бір бағыттан ең көбі 2 · қайталауға болмайды. Әр аудандық шараның ауданын жеке таңдаңыз.</p>
              <DecisionSelector key={resetVersion} data={data} selection={selection} expanded={expanded}
                onExpand={id => setExpanded(expanded === id ? null : id)} onSelect={selectAction} onRemove={removeAction}/>
              <div className="submit-panel"><div className="completion-indicators" aria-label={`${chosen.length} шара таңдалды`}>{categories.map(category => { const Icon = categoryIcons[category.id]; return <span key={category.id} className={chosen.some(a => a.category === category.id) ? 'complete' : ''} title={category.name}><Icon size={15}/></span>; })}<span>{complete ? 'Бес шешім дайын' : `${5 - chosen.length} шара қалды`}</span></div>
                <button className="primary-button calculate-button" type="button" disabled={!complete || simulating} onClick={calculate}>{simulating ? <LoaderCircle className="spin" size={16}/> : <Sparkles size={16}/>} {simulating ? 'Есептелуде…' : 'Симуляцияны іске қосу'}<ArrowRight size={17}/></button>
                <p className="service-note">{data.mode === 'demo' ? 'Демо есеп тек дайын үлгі сценарий үшін көрсетіледі. Өз жоспарыңыз үшін backend-ке қосылыңыз.' : 'Есеп POST /simulate арқылы серверде орындалады.'}</p>
                {simulationError && <p className="inline-error" role="alert">{simulationError}</p>}
              </div>
              <p className="district-change-note">Аудан карточкасы бастапқы көрсеткіштерді ашады. «Қайта бастау» барлық шешімді тазартады.</p>
            </section>
            <aside className="results-column" aria-label="Сценарий нәтижелері"><div className="results-column-heading"><span className="step-label">03 · ШЕШІМДЕРДІҢ ӘСЕРІ</span><ArrowDown size={14}/></div>
              <ScorePanel result={result} baseline={data.baseline} loading={simulating} demo={data.mode === 'demo'}/>

              <div className="fair-start"><CheckCircle2 size={17}/><p><strong>Бірдей бастапқы мүмкіндік</strong><span>Әр жаңа сценарий бірдей бюджет пен бастапқы деректерден басталады.</span></p></div>
            </aside>
          </div>
          <AIAnalysisPanel analysis={analysis} loading={analyzing} error={analysisError} available={Boolean(result)} onAnalyze={requestAnalysis} demo={data.mode === 'demo'}/>
          <OptimizerComparison current={result} result={optimization} loading={optimizing} error={optimizationError} onOptimize={requestOptimization} demo={data.mode === 'demo'}/>
        </>}
        <footer className="page-footer"><span>QALA · HackAlem AI</span><span>Қаланы түсін. Шешім қабылда. Әсерін көр.</span></footer>
      </main>
    </div>
    <span className="sr-only" role="status" aria-live="polite">{notice}</span>
    <dialog className="help-dialog" ref={help} aria-labelledby="help-title"><button type="button" className="dialog-close" onClick={() => help.current?.close()} aria-label="Жабу"><X size={21}/></button><span className="icon-box soft"><Building2 size={25}/></span><h2 id="help-title">5 сағатқа әкім</h2><p>Қаланың бес бағыты бойынша шектеулі бюджетпен шешім қабылдауға арналған симулятор.</p><ol><li>14 шараның ішінен тура 5 шара таңдаңыз. Бір бағыттан ең көбі 2.</li><li>Аудандық шараға жеке аудан таңдаңыз. Қалалық шара барлық 5 ауданға әсер етеді.</li><li>Бюджет пен конфликт ережелерін сақтап, нәтижені есептеңіз.</li><li>AI талдауынан шешімдердің түсіндірмесін оқыңыз.</li></ol><div className="dialog-note">Нақты есептер мен AI кеңесі backend-тен алынады. Сервер қолжетімсіз болса, белгіленген демо режимінде тек дайын үлгі нәтижелері көрсетіледі.</div><button className="primary-button" onClick={() => help.current?.close()}>Түсінікті<Check size={16}/></button></dialog>
  </div>;
}
