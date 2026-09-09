export type Outcome = 'helped' | 'partly' | 'no';
export type Memory = { family: string; strategy: string; outcome: Outcome; at: number };
export const memoryKey = (account: string) => `breezier-days.what-worked.v1.${account}`;
export const routineTopics = new Set(['dressed-now', 'screen-now', 'bored-now', 'leaving-now', 'cleanup-now', 'homework-now']);
export function fingerprint(text: string): string { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(36); }
export function readMemories(raw: string | null, now = Date.now()): Memory[] {
  try { const list: unknown = JSON.parse(raw || '[]'); if (!Array.isArray(list)) return [];
    return list.filter((r): r is Memory => !!r && typeof r.family === 'string' && r.family.length < 160 && typeof r.strategy === 'string' && r.strategy.length < 20 && ['helped','partly','no'].includes(r.outcome) && Number.isFinite(r.at) && r.at <= now && r.at > now - 90 * 86400000).slice(-60);
  } catch { return []; }
}
export function remember(list: Memory[], record: Memory): Memory[] { return [...list.filter(r => r.family !== record.family || r.strategy !== record.strategy), record].slice(-60); }
export function preferredStrategy(options: string[], memories: Memory[], family: string): { text: string; reason: 'helped' | 'alternative' | 'partial' | null } {
  const relevant = memories.filter(r => r.family === family);
  const positive = relevant.filter(r => r.outcome === 'helped' && options.some(o => fingerprint(o) === r.strategy)).sort((a,b) => b.at-a.at)[0];
  if (positive) return {text: options.find(o=>fingerprint(o)===positive.strategy)!, reason:'helped'};
  const first = relevant.find(r => r.strategy === fingerprint(options[0]) && (r.outcome === 'no' || r.outcome === 'partly'));
  const alternative = first && options.slice(1).find(o => !relevant.some(r=>r.strategy===fingerprint(o)&&r.outcome==='no'));
  return {text: alternative || options[0], reason: alternative ? first!.outcome === 'partly' ? 'partial' : 'alternative' : null};
}
export type FamilyChild = {id: number; name: string; stage: string; traits: string[]};
export function sharedRoles(children: FamilyChild[]): {id:number; name:string; role:string}[] {
  const role: Record<string,string> = {
    baby: 'Watch a picture book with the caregiver or listen to a short song while comfortably supported. Keep direct care with an adult.',
    toddler: 'Choose a large toy and name or point to it while an adult stays nearby.',
    preschool: 'Draw that toy as a character and suggest what happens first.',
    bigkid: 'Create a short comic about the character, with a beginning, problem, and solution.',
    tween: 'Choose the format—comic, illustrated guide, or short story—and develop the plot or design independently.',
  };
  return children.map(c => ({id:c.id,name:c.name,role: (role[c.stage] || role.bigkid) + (c.traits.includes('sensitive') || c.traits.includes('slow-to-warm-up') ? ' Offer a quiet spot and permission to watch first.' : c.stage !== 'baby' && c.traits.includes('very-active') ? ' They can act out their part with safe movement.' : '')}));
}
