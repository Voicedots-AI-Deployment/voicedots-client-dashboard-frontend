import {useMemo} from 'react';
import {flexRender,getCoreRowModel,useReactTable,type ColumnDef,type SortingState} from '@tanstack/react-table';
import type {CollegeStudent} from '@/api/collegeApi';
import {displayName} from './placementDisplay';
export default function StudentRosterTable({students,total,offset,busy,onPage,onSort,sorting,onEdit}:{students:CollegeStudent[];total:number;offset:number;busy:boolean;onPage:(offset:number)=>void;onSort:(value:SortingState)=>void;sorting:SortingState;onEdit:(student:CollegeStudent)=>void}) {
 const columns=useMemo<ColumnDef<CollegeStudent>[]>(()=>[
  {accessorKey:'full_name',header:'Student',cell:({row})=><><strong>{displayName(row.original.full_name)}</strong><p className="mt-1 text-xs text-slate-500">{row.original.email}</p></>},
  {accessorKey:'roll_number',header:'Roll number'},
  {accessorKey:'program',header:'Program',enableSorting:false},
  {accessorKey:'department_code',header:'Department',enableSorting:false},
  {accessorKey:'batch_label',header:'Batch',enableSorting:false},
  {accessorKey:'graduation_year',header:'Graduation'},
  {accessorKey:'cgpa',header:'Cgpa'},
  {accessorKey:'status',header:'Status',enableSorting:false,cell:info=>displayName(String(info.getValue()))},
  {id:'actions',header:'Actions',enableSorting:false,cell:({row})=><button className="rounded-lg border px-3 py-2" onClick={()=>onEdit(row.original)}>Edit</button>},
 ],[onEdit]);
 const table=useReactTable({data:students,columns,getCoreRowModel:getCoreRowModel(),manualPagination:true,manualSorting:true,rowCount:total,state:{pagination:{pageIndex:offset/25,pageSize:25},sorting},onSortingChange:updater=>onSort(typeof updater==='function'?updater(sorting):updater),onPaginationChange:updater=>{const p={pageIndex:offset/25,pageSize:25};onPage((typeof updater==='function'?updater(p):updater).pageIndex*25);}});
 return <><div className="overflow-x-auto rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-900" aria-busy={busy}><table className="w-full text-left text-sm"><thead>{table.getHeaderGroups().map(group=><tr key={group.id}>{group.headers.map(header=><th key={header.id} className="whitespace-nowrap p-4" aria-sort={header.column.getIsSorted()==='asc'?'ascending':header.column.getIsSorted()==='desc'?'descending':undefined}>{header.column.getCanSort()?<button disabled={busy} onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header,header.getContext())} {header.column.getIsSorted()==='asc'?'↑':header.column.getIsSorted()==='desc'?'↓':'↕'}</button>:flexRender(header.column.columnDef.header,header.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map(row=><tr key={row.original.id} className="border-t dark:border-slate-800">{row.getVisibleCells().map(cell=><td key={cell.id} className="p-4">{flexRender(cell.column.columnDef.cell,cell.getContext())}</td>)}</tr>)}</tbody></table>{!students.length&&!busy&&<p className="p-8 text-slate-500">No students match these filters.</p>}</div><div className="flex items-center justify-between gap-3 text-sm"><span>{total?`${offset+1}–${Math.min(offset+25,total)} of ${total}`:'0 students'}</span><div className="flex gap-2"><button className="rounded-lg border px-3 py-2" disabled={busy||!table.getCanPreviousPage()} onClick={()=>table.previousPage()}>Previous</button><button className="rounded-lg border px-3 py-2" disabled={busy||!table.getCanNextPage()} onClick={()=>table.nextPage()}>Next</button></div></div></>;
}
