import {useState} from 'react';
import {ChevronDown,Check,Plus,Trash2} from 'lucide-react';
import {categories,indicatorNames,type CityData,type Selection,type CategoryId,type Decision,type IndicatorId} from '../types';
import {upsertDecision,validateSelection} from '../lib/budget';
import {categoryIcons} from './icons';

interface Props {data:CityData;selection:Selection;expanded:CategoryId|null;onExpand:(id:CategoryId)=>void;onSelect:(decision:Decision)=>void;onRemove:(id:string)=>void}
export function DecisionSelector({data,selection,expanded,onExpand,onSelect,onRemove}:Props){
  const [targets,setTargets]=useState<Record<string,string>>({});
  const [error,setError]=useState('');
  function changeTarget(actionId:string,districtId:string){
    const decision={actionId,districtId:districtId||null};
    if(selection.some(d=>d.actionId===actionId)){
      const errors=validateSelection(upsertDecision(selection,decision),data);
      if(errors.length){setError(errors.join(' '));return;}
      onSelect(decision);
    }
    setTargets(previous=>({...previous,[actionId]:districtId}));setError('');
  }
  return <div className="decision-list">
    <div className="rules-note">Конфликттер: M1 ↔ M3 — кез келген ауданда; M4 ↔ M7 және M5 ↔ M13 — бір ауданда.</div>
    {error&&<p className="inline-error" role="alert">{error}</p>}
    {categories.map((category,index)=>{
      const Icon=categoryIcons[category.id],open=expanded===category.id;
      const count=selection.filter(d=>data.actions.find(a=>a.id===d.actionId)?.category===category.id).length;
      return <article className={`decision-card ${open?'open':''} ${count?'has-selection':''}`} key={category.id}>
        <button type="button" className="decision-heading" aria-label={`${category.name} шаралары`} onClick={()=>onExpand(category.id)} aria-expanded={open} aria-controls={`options-${category.id}`}>
          <span className={`category-icon ${category.id}`}><Icon size={21}/></span><span className="decision-label"><span className="decision-number">БАҒЫТ 0{index+1}</span><strong>{category.name}</strong><span className="chosen-name">{category.description}</span></span>
          <span className="decision-heading-end"><span>{count} / 2</span><ChevronDown size={17}/></span>
        </button>
        {open&&<div className="decision-options" id={`options-${category.id}`}>{data.actions.filter(a=>a.category===category.id).map(action=>{
          const selected=selection.find(d=>d.actionId===action.id);
          const target=selected?.districtId??targets[action.id]??'';
          const decision={actionId:action.id,districtId:action.scope==='city'?null:(target||null)};
          const errors=validateSelection(upsertDecision(selection,decision),data);
          return <div className={`measure-option ${selected?'picked':''}`} key={action.id}>
            <div className="measure-title"><strong>{action.id} · {action.title}</strong><span>{action.cost} бірлік</span></div>
            <p className="measure-meta">{action.scope==='city'?'Қала · барлық 5 аудан':'Аудан'} · Лаг: {action.lag} тоқсан</p>
            <p className="effect-list">Толық әсер: {Object.entries(action.effects).map(([key,value])=><span key={key} title={indicatorNames[key as IndicatorId]}>{key} {value!>0?'+':''}{value}</span>)}</p>
            {action.scope==='district'&&<label className="target-label">Шара ауданы<select aria-label={`${action.id} ауданы`} value={target} onChange={e=>changeTarget(action.id,e.target.value)}><option value="">Ауданды таңдаңыз</option>{data.districts.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select></label>}
            <button className={selected?'secondary-button':'primary-button'} type="button" aria-label={selected?`${action.id} алып тастау`:`${action.id} таңдау`} disabled={!selected&&errors.length>0} onClick={()=>{setError('');if(selected) onRemove(action.id);else onSelect(decision);}}>
              {selected?<Trash2 size={14}/>:<Plus size={14}/>} {selected?'Алып тастау':'Таңдау'} {selected&&<Check size={14}/>}</button>
            {!selected&&errors.length>0&&<p className="choice-reason" id={`reason-${action.id}`}>{errors.join(' ')}</p>}
          </div>;
        })}</div>}
      </article>;
    })}
    {selection.length>0&&<section className="plan-summary" aria-label="Таңдалған шаралар"><h3>Менің 5 шешімім · {selection.length}/5</h3>{selection.map(d=>{
      const a=data.actions.find(a=>a.id===d.actionId)!;
      return <div key={d.actionId}><span><strong>{a.id}</strong> · {a.title}<small>{d.districtId?data.districts.find(x=>x.id===d.districtId)?.name:'Бүкіл қала'} · {a.cost} бірлік</small></span><button className="text-button" onClick={()=>{setError('');onRemove(a.id);}} aria-label={`Жоспардан ${a.id} алып тастау`}><Trash2 size={16}/></button></div>;
    })}</section>}
  </div>;
}
