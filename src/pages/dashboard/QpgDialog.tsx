import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
export default function Dialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
  const ref=useRef<HTMLElement>(null);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    ref.current?.querySelector<HTMLElement>('button,input,select,textarea')?.focus();
    return ()=>{document.body.style.overflow=overflow;previous?.focus();};
  },[]);
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={ref} role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onKeyDown={e=>{
    if(e.key==='Escape'){e.stopPropagation();onClose();}
    if(e.key==='Tab'){const nodes=ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]');if(nodes?.length){const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
  }}><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-bold">{title}</h2><Button variant="ghost" onClick={onClose}>Close</Button></div>{children}</section></div>;
}

