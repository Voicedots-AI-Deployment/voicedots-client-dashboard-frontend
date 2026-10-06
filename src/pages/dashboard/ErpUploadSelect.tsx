import {useEffect,useId,useRef,useState} from 'react';
import {Check,ChevronDown} from 'lucide-react';
type Item={value:string;label:string};
export default function ErpUploadSelect({label,value,placeholder,options,disabled,onChange}:{label:string;value:string;placeholder:string;options:Item[];disabled:boolean;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);const [active,setActive]=useState(0);const root=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLButtonElement>(null);const id=useId();
 const items=[{value:'',label:placeholder},...options];const selected=items.find(item=>item.value===value);
 useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
 useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
 useEffect(()=>{if(open)root.current?.querySelector<HTMLElement>(`[data-option="${active}"]`)?.scrollIntoView({block:'nearest'});},[open,active]);
 function choose(next:string){onChange(next);setOpen(false);trigger.current?.focus();}
 return <div className="erp-upload-select" ref={root}><button type="button" ref={trigger} role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} aria-activedescendant={open?`${id}-${active}`:undefined} disabled={disabled} onClick={()=>{setActive(Math.max(0,items.findIndex(item=>item.value===value)));setOpen(!open);}} onKeyDown={event=>{
  if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setOpen(false);}
  else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(!open){setOpen(true);setActive(Math.max(0,items.findIndex(item=>item.value===value)));}else setActive(index=>Math.max(0,Math.min(items.length-1,index+(event.key==='ArrowDown'?1:-1))));}
  else if(open&&(event.key==='Enter'||event.key===' ')){event.preventDefault();choose(items[active].value);}
  else if(open&&event.key==='Home'){event.preventDefault();setActive(0);}
  else if(open&&event.key==='End'){event.preventDefault();setActive(items.length-1);}
  else if(event.key==='Tab')setOpen(false);
 }}><span>{selected?.label||placeholder}</span><ChevronDown size={16}/></button>{open&&<div id={id} role="listbox" aria-label={label} className="erp-upload-options">{items.map((item,index)=><div key={item.value} id={`${id}-${index}`} role="option" aria-selected={item.value===value} data-option={index} className={active===index?'is-active':''} onPointerMove={()=>setActive(index)} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(item.value)}><span>{item.label}</span>{item.value===value&&<Check size={14}/>}</div>)}</div>}</div>;
}
