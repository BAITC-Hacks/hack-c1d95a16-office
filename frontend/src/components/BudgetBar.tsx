import { Wallet, ArrowUpRight } from 'lucide-react';
import { number } from '../lib/format';

export function BudgetBar({ budget, spent, unit }: { budget: number; spent: number; unit: string }) {
  const remaining = Math.max(0, Math.round((budget - spent) * 100) / 100);
  const percent = Math.min(100, Math.max(0, spent / budget * 100));
  return <section className="budget-card" aria-label="Қала бюджеті">
    <div className="budget-title"><span className="icon-box"><Wallet size={21} /></span><div><span className="eyebrow">СЦЕНАРИЙ БЮДЖЕТІ</span><p>Әр шешімнің өз құны бар</p></div></div>
    <div className="budget-stat"><span>Жалпы бюджет</span><strong>{number(budget)} <small>{unit}</small></strong></div>
    <div className="budget-stat"><span>Жұмсалған</span><strong data-testid="spent">{number(spent)} <small>{unit}</small></strong></div>
    <div className={`budget-stat remaining ${remaining === 0 ? 'exhausted' : ''}`}><span><ArrowUpRight size={14} /> Қалған қаражат</span><strong data-testid="remaining">{number(remaining)} <small>{unit}</small></strong></div>
    <div className="budget-track" role="progressbar" aria-label="Бюджетті пайдалану" aria-valuenow={spent} aria-valuemin={0} aria-valuemax={budget}><span style={{ width: `${percent}%` }} /></div>
  </section>;
}
