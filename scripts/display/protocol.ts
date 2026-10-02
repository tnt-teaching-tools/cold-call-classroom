// Only the pupil-visible fields can enter an encrypted display update.
export interface PupilState {
 mode: 'idle' | 'name' | 'timer' | 'paused';
 name?: string; avatar?: string; prompt?: string; phase?: 'think' | 'pair' | 'check'; endsAt?: number;
 progress?: {round:number; picked:number; total:number};
}
export function cleanSnapshot(value:unknown):PupilState {
 const v=(value && typeof value==='object'?value:{}) as Record<string,unknown>;
 const mode=['idle','name','timer','paused'].includes(String(v.mode))?v.mode as PupilState['mode']:'idle';
 const safe:PupilState={mode};
 if(mode==='name'){safe.name=String(v.name||'').slice(0,70);safe.avatar=String(v.avatar||'').slice(0,12);if(v.prompt)safe.prompt=String(v.prompt).slice(0,200);}
 if(mode==='timer'){safe.prompt=String(v.prompt||'').slice(0,200);safe.phase=['think','pair','check'].includes(String(v.phase))?v.phase as PupilState['phase']:'think';safe.endsAt=typeof v.endsAt==='number' && Number.isFinite(v.endsAt)?Math.min(v.endsAt,Date.now()+600000):Date.now();}
 const p=v.progress as Record<string,unknown> | undefined;
 if(p && Number.isInteger(p.round) && Number.isInteger(p.picked) && Number.isInteger(p.total) && Number(p.round)>0 && Number(p.picked)>=0 && Number(p.total)>=0 && Number(p.picked)<=Number(p.total)) safe.progress={round:Number(p.round),picked:Number(p.picked),total:Number(p.total)};
 return safe;
}
