import { useId, useState } from 'react';

/** Preserve saved evidence while keeping review summaries easy to scan. */
export default function EvidenceText({text,limit=240}: {text:string;limit?:number}) {
  const [expanded,setExpanded]=useState(false);
  const id=useId();
  const value=text.trim();
  const long=value.length>limit;
  const preview=long?`${value.slice(0,limit).replace(/\s+\S*$/, '').trimEnd()}…`:value;
  return <span className="evidence-text"><span id={id} className="whitespace-pre-line break-words">{expanded?value:preview}</span>{long&&<button type="button" aria-expanded={expanded} aria-controls={id} className="evidence-text-toggle" onClick={()=>setExpanded(current=>!current)}>{expanded?'Show less':'Read full evidence'}</button>}</span>;
}
