import { Check, ChevronDown, Circle, RotateCcw, LockKeyhole } from 'lucide-react';
import { categories, type Action, type CategoryId, type Selection } from '../types';
import { trySelect } from '../lib/budget';
import { number } from '../lib/format';
import { categoryIcons } from './icons';

interface Props {
  actions: Action[]; selection: Selection; budget: number; unit: string; districtId: string;
  expanded: CategoryId | null; onExpand: (id: CategoryId) => void;
  onSelect: (action: Action) => void; onRemove: (id: CategoryId) => void;
}
export function DecisionSelector({ actions, selection, budget, unit, districtId, expanded, onExpand, onSelect, onRemove }: Props) {
  return <div className="decision-list">{categories.map((category, index) => {
    const Icon = categoryIcons[category.id];
    const chosen = actions.find(a => a.id === selection[category.id]);
    const options = actions.filter(a => a.category === category.id && (!a.districtIds || a.districtIds.includes(districtId)));
    const open = expanded === category.id;
    return <article className={`decision-card ${open ? 'open' : ''} ${chosen ? 'has-selection' : ''}`} key={category.id}>
      <button type="button" className="decision-heading" onClick={() => onExpand(category.id)} aria-expanded={open} aria-controls={`options-${category.id}`}>
        <span className={`category-icon ${category.id}`}><Icon size={21}/></span>
        <span className="decision-label"><span className="decision-number">ШЕШІМ 0{index + 1}</span><strong>{category.name}</strong><span className="chosen-name">{chosen?.title ?? category.description}</span></span>
        <span className="decision-heading-end">{chosen ? <span className="selected-cost">{number(chosen.cost)} <small>{unit}</small></span> : <span className="unselected">Таңдалмады</span>}<ChevronDown className={open ? 'rotated' : ''} size={17}/></span>
      </button>
      {open && <div className="decision-options" id={`options-${category.id}`}>
        <p className="option-helper">Бір шара таңдаңыз. Басқа шараны таңдасаңыз, алдыңғысы ауысады.</p>
        {options.length === 0 ? <p className="empty-inline">Бұл ауданға арналған шаралар әлі берілмеген.</p> : options.map(action => {
          const picked = chosen?.id === action.id;
          const affordable = trySelect(selection, action, actions, budget, districtId) !== null;
          return <button type="button" key={action.id} className={`action-option ${picked ? 'picked' : ''}`} disabled={!affordable}
            onClick={() => onSelect(action)} aria-pressed={picked} aria-label={`${category.name}: ${action.title}, ${action.cost} ${unit}`}
            title={!affordable ? 'Бұл шараға қалған бюджет жеткіліксіз' : action.description}>
            <span className="radio-mark">{picked ? <Check size={13}/> : !affordable ? <LockKeyhole size={12}/> : <Circle size={14}/>}</span>
            <span className="action-description"><strong>{action.title}</strong><span>{!affordable ? 'Бюджет жеткіліксіз' : action.description}</span></span>
            <span className="action-cost">{number(action.cost)}<small>{unit}</small></span>
          </button>;
        })}
        {chosen && <button type="button" className="text-button clear-choice" onClick={() => onRemove(category.id)}><RotateCcw size={13}/>Осы таңдауды алып тастау</button>}
      </div>}
    </article>;
  })}</div>;
}
