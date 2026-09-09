import React, {useState} from 'react';
import {sharedRoles, type FamilyChild} from './familyPersonalization';
type Props={children:FamilyChild[];primary:number|null;day:string;schedule:{label:string;time:string;childId?:number|null}[];activityOnly?:boolean};
export default function PremiumFamilyTools({children,primary,day,schedule,activityOnly=false}:Props){
  const [included,setIncluded]=useState<number[]>(primary!==null?[primary]:children.slice(0,1).map(c=>c.id));
  const selected=children.filter(c=>included.includes(c.id));const roles=sharedRoles(selected);
  const events=schedule.filter(e=>e.childId==null||included.includes(e.childId));
  return <details className="premium-family-tools"><summary>{activityOnly?'👧 One idea for everyone':'💛 Today is a lot'} <small>{activityOnly?'Premium · different ages, shared play':`Premium · a simpler ${day.toLowerCase()}`}</small></summary>
    {children.length>1&&<fieldset><legend>Who is with you?</legend><div className="family-inline-actions">{children.map(c=><label key={c.id}><input type="checkbox" checked={included.includes(c.id)} onChange={()=>setIncluded(ids=>ids.includes(c.id)?ids.filter(id=>id!==c.id):[...ids,c.id])}/>{c.name}</label>)}</div></fieldset>}
    {!activityOnly && <><p><strong>Next:</strong> {events.length?'Check the next commitment below, and get only what it needs ready.':'Choose the next meal, feed, or rest routine. Start with that one thing.'}</p>
    <p><strong>Keep:</strong> food, necessary care, and your usual rest routines. <strong>Skip:</strong> optional outings, extra activities, and nonessential tidying if they can wait.</p>
    <p><strong>Easy food:</strong> {selected.some(c=>c.stage==='baby')?'Keep your baby’s usual feeding routine. For everyone else, use a familiar ready-to-serve meal or suitable leftovers.':'Use a familiar ready-to-serve meal or suitable leftovers; no new recipe needed.'} Follow your family’s usual allergy and food-safety needs.</p></>}
    <div className="shared-family-activity"><strong>{selected.length>1?'One idea, different roles':'One easy activity'}: a tiny story about a favorite toy</strong>
      {roles.length?roles.map(r=><p key={r.id}><b>{r.name}:</b> {r.role}</p>):<p>Share a familiar book or tell a short story. Choose the amount of help that fits the child’s abilities.</p>}
      {roles.length>1&&<small>Each child can work alongside you; nobody has to wait for a turn. Older children are not responsible for supervising younger children.</small>}
    </div>
    {!activityOnly && <>{events.length>0?<div className="family-schedule"><strong>Keep these commitments</strong><ul>{events.slice(0,2).map((e,i)=><li key={i}><strong>{e.time||'Time not set'}:</strong> {e.label}</li>)}</ul>{events.length>2&&<details><summary>See {events.length-2} more commitments</summary><ul>{events.slice(2).map((e,i)=><li key={i}><strong>{e.time||'Time not set'}:</strong> {e.label}</li>)}</ul></details>}</div>:<small>No commitments are entered for this selection. Keep any school, appointments, naps, or bedtime plans you already have.</small>}
    <small>This is a simpler view of the day. Your saved schedule stays intact.</small></>}
  </details>;
}
