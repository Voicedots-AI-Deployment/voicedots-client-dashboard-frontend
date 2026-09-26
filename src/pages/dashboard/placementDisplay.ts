// Display formatting only: preserve stored names, codes and login identifiers.
export const PLACEMENT_TIME_ZONE = 'Asia/Kolkata';

export function formatDateOnly(value?: string | null) {
 if(!value)return 'Not scheduled';
 const match=value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(!match)return 'Not scheduled';
 const [,year,month,day]=match;
 const parsed=new Date(Date.UTC(Number(year),Number(month)-1,Number(day)));
 return parsed.getUTCFullYear()===Number(year)&&parsed.getUTCMonth()+1===Number(month)&&parsed.getUTCDate()===Number(day)
  ?`${day}/${month}/${year}`:'Not scheduled';
}

export function formatPlacementDateTime(value?: string | null, timeZone = PLACEMENT_TIME_ZONE) {
 if(!value)return 'Not scheduled';
 const instant=new Date(value);
 return Number.isFinite(instant.getTime())
  ?`${instant.toLocaleString('en-GB',{timeZone,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})} ${timeZone==='Asia/Kolkata'?'IST':timeZone}`
  :'Not scheduled';
}

export function displayName(value?: string) {
 const text=(value || '').trim().toLocaleLowerCase().replace(/[-_]+/g, ' ');
 const exact: Record<string, string> = {
  official: 'Official Placement',
  'official placement': 'Official Placement',
  'college practice': 'College Practice',
  'full time': 'Full Time',
  'ai generated': 'AI Generated',
  'not started': 'Not Started',
  'in progress': 'In Progress',
  'needs review': 'Needs Review',
  'held for review': 'Held for Review',
  'not tested': 'Not Tested',
  'no clear answer': 'No Clear Answer',
  limited: 'Limited',
  scheduled: 'Scheduled',
  active: 'Active',
  closed: 'Closed',
 };
 if (exact[text]) return exact[text];
 return text ? text.replace(/\b\w/g, char => char.toLocaleUpperCase()) : '';
}

export function wallTimeToInstant(value: string, timeZone: string) {
 const match=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
 if(!match)return Number.NaN;
 const target=match.slice(1).map(Number);
 const nominal=Date.UTC(target[0],target[1]-1,target[2],target[3],target[4]);
 let instant=nominal;
 try {
  for(let index=0;index<4;index++){
   const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));
   const part=(type:string)=>Number(parts.find(item=>item.type===type)?.value);
   const represented=Date.UTC(part('year'),part('month')-1,part('day'),part('hour'),part('minute'));
   const delta=represented-instant;
   if(delta===0)break;
   instant=nominal-delta;
  }
  const check=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));
  const result=[Number(check.find(item=>item.type==='year')?.value),Number(check.find(item=>item.type==='month')?.value),Number(check.find(item=>item.type==='day')?.value),Number(check.find(item=>item.type==='hour')?.value),Number(check.find(item=>item.type==='minute')?.value)];
  return result.every((value,index)=>value===target[index])?instant:Number.NaN;
 }catch{return Number.NaN;}
}

export function wallTimeFromInstant(value?: string, timeZone = 'UTC') {
 if(!value)return '';
 const instant=Date.parse(value);
 if(!Number.isFinite(instant))return '';
 try{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));
  const part=(type:string)=>parts.find(item=>item.type===type)?.value||'';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
 }catch{return '';}
}

export function formatWallTime(value: string, timeZone: string) {
 const instant=wallTimeToInstant(value,timeZone);
 return Number.isFinite(instant)?formatPlacementDateTime(new Date(instant).toISOString(),timeZone):'Not scheduled';
}
