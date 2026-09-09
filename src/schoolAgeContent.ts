export type Stage = 'baby'|'toddler'|'preschool'|'bigkid'|'tween';
export const isSchoolAge = (stage:string) => stage==='bigkid'||stage==='tween';
export function explicitAge(text:string):Stage|null {
  text=text.toLowerCase();
  const matches=[...text.toLowerCase().matchAll(/\b(\d{1,2})\s*[-–]?\s*(years?|yrs?|months?|mos?)(?:\s*[-–]?\s*old)?\b/g)];
  if(matches.length){const m=matches[0],n=Number(m[1]);return /month|mo/.test(m[2])?(n<=12?'baby':n<36?'toddler':n<72?'preschool':n<108?'bigkid':'tween'):n<1?'baby':n<3?'toddler':n<6?'preschool':n<9?'bigkid':'tween'}
  if(/\btween\b/.test(text))return 'tween';
  if(/\bbig kid|school[ -]age|older child|older kid/.test(text))return 'bigkid';
  if(/\bpreschool|pre-school/.test(text))return 'preschool';
  if(/\btoddler\b/.test(text))return 'toddler';
  if(/\bbaby|\binfant|\bnewborn/.test(text))return 'baby';
  return null;
}
type Advice={title:string;emoji:string;doNow:string;sayThis:string;avoidThis:string;afterward:string};
export function schoolAgeAdvice(text:string,stage:string):Advice|null {
  if(!isSchoolAge(stage))return null;const t=text.toLowerCase();const tween=stage==='tween';
  if (/\bi(?:[’']m| am| feel| need| might| could)\s+(?:completely\s+)?(?:overwhelmed|losing control|lose control|a break|to calm|hurt|snap)/.test(t)) return null;
  if(/potty|toilet|bathroom|wetting|wet the bed|wet pants|withhold|poop|soiling/.test(t))return {
    title:/bed|night/.test(t)?'Support nighttime wetting without blame':/avoid|refus|fear|withhold/.test(t)?'Find out what makes the bathroom difficult':'Handle a bathroom accident privately',emoji:'🚽',
    doNow:'Offer privacy, clean clothes, and practical help without making it a public event. Ask quietly about discomfort, constipation, or trouble accessing a bathroom at school. Let your child handle the parts of cleanup they can manage, with support available.',
    sayThis:'You are not in trouble. Let’s get comfortable, then work out what would help.',
    avoidThis:'Do not shame, punish, compare with younger children, or treat staying dry as a matter of trying harder.',
    afterward:'For new or recurring accidents, nighttime wetting, pain, or constipation, contact your child’s healthcare professional. If school bathroom access or embarrassment is involved, agree on a discreet plan with the teacher or school nurse.',
  };
  if(/school/.test(t)&&/refus|won.?t go|will not go|avoid|scared|fear/.test(t))return {
    title:'Understand what is making school hard',emoji:'🏫',doNow:'Check whether your child is ill or unsafe. Ask privately what feels hardest about going: a class, teacher, friendship, workload, or something else. Listen without debating, then choose one manageable next step toward the school day together.',sayThis:'I want to understand what is hard. Let’s work with school on the next step.',avoidThis:'Avoid shame, threats, assuming laziness, or promising that an ongoing problem will fix itself.',afterward:'Contact the teacher or school support team about repeated avoidance. Involve your child’s healthcare professional if distress, physical symptoms, or absence continues.',
  };
  if(/meltdown|melt(?:s|ing)? down|tantrum|yell|shut(?:ting)? down|outburst|frustrat|overwhelm|losing control|time[ -]?out|argu/.test(t))return {
    title:tween?'Help your tween through an emotional outburst':'Help with big emotions',emoji:'💛',doNow:'Lower your voice and reduce the audience. Keep a clear boundary around hurting people or damaging things. Offer space in a safe place while staying available; do not insist on talking or explaining during the peak.',sayThis:'You can be upset. We still need to keep people safe. Take some space; I’m here when you’re ready.',avoidThis:'Avoid arguing, public correction, forced affection, or treating a calm-down break as punishment.',afterward:tween?'Talk privately afterward. Hear their perspective, agree on any repair, and let them help design a plan for the next trigger.':'When calm, name what happened, make any needed repair, and work together on one way to handle the trigger next time.',
  };
  if(/dress|hygiene|brush|teeth|bath|shower|clean.?up|tidy|chores|homework|belongings|routine|transition|leav|screen|listen|refus/.test(t))return {
    title:/schoolwork|homework/.test(t)?'Make the first schoolwork step manageable':/brush|teeth|bath|shower|hygiene/.test(t)?'Support an independent hygiene routine':'Make the next responsibility clear',emoji:'🧭',doNow:'State the essential task and when it needs to happen. Ask what is getting in the way, then let your child choose the order or approach within that boundary. Agree on a brief check-in; offer help with a specific barrier instead of doing every step for them.',sayThis:'This needs doing. What is your plan, and which part needs help?',avoidThis:'Avoid repeated prompting, baby talk, unrelated rewards, or turning every task into an argument.',afterward:'Review what worked and simplify the routine together. Keep expectations realistic and practice a missing skill when there is time.',
  };
  return null;
}
export function schoolLabel(text:string,stage:string):string {
  if(!isSchoolAge(stage))return text;
  return text.replace(/Potty Training/gi,'Bathroom issues').replace(/Preschool Lunch Ideas/gi,'School Lunch Ideas').replace(/preschooler/gi,'school-age child').replace(/school or daycare/gi,'school').replace(/preschool|daycare/gi,'school').replace(/tantrums?/gi,'emotional outbursts').replace(/\bpotty\b/gi,'bathroom');
}
