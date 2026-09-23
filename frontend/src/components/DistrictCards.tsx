import {MapPin,Check,ArrowUpRight} from 'lucide-react';
import {indicatorIds,indicatorNames,type District} from '../types';
import {number} from '../lib/format';
export function DistrictCards({districts,selectedId,onSelect}:{districts:District[];selectedId:string;onSelect:(id:string)=>void}){
  const selected=districts.find(d=>d.id===selectedId);
  return <section id="districts" className="section-block">
    <div className="section-heading"><div><span className="step-label">01 · БАСТАПҚЫ ЖАҒДАЙ</span><h2>Астананың бес ауданы</h2></div><span className="muted small">Карточкадан барлық көрсеткішті ашыңыз</span></div>
    <div className="district-grid official-districts">{districts.map((d,index)=><button type="button" key={d.id} className={`district-card ${d.id===selectedId?'selected':''}`} aria-label={`Аудан: ${d.name}`} aria-pressed={d.id===selectedId} onClick={()=>onSelect(d.id)}>
      <div className={`district-illustration district-art-${index%3}`} aria-hidden="true"><div className="art-road"/><i/><i/><i/><i/><i/><i/><span className="art-tree"/><span className="district-index">0{index+1}</span><span className="district-check">{d.id===selectedId?<Check size={15}/>:<ArrowUpRight size={15}/>}</span></div>
      <div className="district-body"><h3><MapPin size={15}/>{d.name}</h3><p>{d.description}</p><div className="district-metrics"><div><span>Халық үлесі</span><strong>{number(d.share*100)}%</strong></div><div><span>Бастапқы D</span><strong>{d.baselineD===null?'Есеп күтілуде':number(d.baselineD)}</strong></div></div></div>
    </button>)}</div>
    {selected&&<details className="district-details" open><summary>{selected.name} · бастапқы 10 көрсеткіш</summary><p>0–100: жоғары болғаны жақсы. 40-тан төмен мән — критикалық.</p><div className="indicator-grid">{indicatorIds.map(key=><div key={key} className={selected.indicators[key]<40?'critical':''}><span>{key} · {indicatorNames[key]}</span><strong>{selected.indicators[key]}</strong></div>)}</div></details>}
  </section>;
}
