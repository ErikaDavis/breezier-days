import React, {useEffect, useState} from 'react';
import {fingerprint, memoryKey, preferredStrategy, readMemories, remember, type Outcome} from './familyPersonalization';
type Props = {account:string; childId:number; stage:string; topic:string; options:string[];onChoice:(text:string)=>void};
export default function RememberWhatWorks({account,childId,stage,topic,options,onChoice}:Props) {
  const key=memoryKey(account), family=`${childId}:${stage}:${topic}`;
  const [choice] = useState(()=>{try{return preferredStrategy(options,readMemories(localStorage.getItem(key)),family)}catch{return {text:options[0],reason:null}}});
  const [status,setStatus]=useState('');const [vote,setVote]=useState<Outcome|null>(null);
  useEffect(()=>onChoice(choice.text),[choice.text,onChoice]);
  const [showReason] = useState(()=>{try{return !sessionStorage.getItem(`${key}.shown.${family}`)}catch{return false}});
  useEffect(()=>{try{const raw=localStorage.getItem(key);if(raw)localStorage.setItem(key,JSON.stringify(readMemories(raw)))}catch{}},[key]);
  useEffect(()=>{if(choice.reason)try{sessionStorage.setItem(`${key}.shown.${family}`,'1')}catch{}},[key,family,choice.reason]);
  const rate=(outcome:Outcome)=>{try{const list=readMemories(localStorage.getItem(key));localStorage.setItem(key,JSON.stringify(remember(list,{family,strategy:fingerprint(choice.text),outcome,at:Date.now()})));setVote(outcome);setStatus('Remembered on this device.')}catch{setStatus('This browser could not save feedback. Your help is still available.')}};
  return <><p style={{whiteSpace:'pre-line'}}>{choice.text}</p><div className="remember-feedback">
    {showReason && choice.reason && <p className="remember-context">{choice.reason==='helped'?'This helped before for this child and situation. Try it again if it fits today.':choice.reason==='partial'?'That earlier approach helped a little. Here is another option to try.':'That earlier approach did not help. Here is another option to try.'}</p>}
    <span>Did this help? <small>Premium · Remember what works</small></span>
    <div className="family-inline-actions">{([['helped','Helped'],['partly','Helped a little'],['no','Didn’t help']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={vote===value} onClick={()=>rate(value)}>{label}</button>)}</div>
    <small>Optional. Feedback is used for up to 90 days, stays on this device, and is not sent to analytics.</small>
    <details><summary>Feedback privacy & controls</summary><p>Only a child reference, age stage, situation and strategy identifiers, rating, and date are saved—not names, questions, or answer text. Feedback does not sync between devices.</p><button type="button" onClick={()=>{try{localStorage.removeItem(key);setVote(null);setStatus('All remembered feedback for this account was cleared on this device. Future answers will use the standard suggestions.')}catch{setStatus('This browser could not clear feedback.')}}}>Clear remembered feedback</button></details>
    {status&&<small role="status">{status}</small>}
  </div></>;
}
