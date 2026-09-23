import { MapPin, Users, Check, ArrowUpRight } from 'lucide-react';
import type { District } from '../types';
import { number } from '../lib/format';

export function DistrictCards({ districts, selectedId, onSelect }: { districts: District[]; selectedId: string; onSelect: (id: string) => void }) {
  return <section id="districts" className="section-block">
    <div className="section-heading"><div><span className="step-label">01 · БАСТАПҚЫ ЖАҒДАЙ</span><h2>Қай ауданнан бастаймыз?</h2></div><span className="muted small">Жоспар үшін бір ауданды таңдаңыз</span></div>
    <div className="district-grid">{districts.map((district, index) => <button type="button" key={district.id}
      className={`district-card ${district.id === selectedId ? 'selected' : ''}`} aria-pressed={district.id === selectedId}
      onClick={() => onSelect(district.id)} aria-label={`Аудан: ${district.name}`}>
      <div className={`district-illustration district-art-${index % 3}`} aria-hidden="true"><div className="art-road"/><i/><i/><i/><i/><i/><i/><span className="art-tree"/><span className="art-tree second"/>
        <span className="district-index">0{index + 1}</span><span className="district-check">{district.id === selectedId ? <Check size={15}/> : <ArrowUpRight size={15}/>}</span>
      </div>
      <div className="district-body"><h3><MapPin size={15}/>{district.name}</h3><p>{district.description}</p>
      {district.population !== undefined && <span className="population"><Users size={13}/>{number(district.population)} тұрғын</span>}
      <div className="district-metrics">{district.metrics.map(metric => <div key={metric.label}><span>{metric.label}</span><strong>{number(metric.value)}<small>{metric.unit}</small></strong></div>)}</div></div>
    </button>)}</div>
  </section>;
}
