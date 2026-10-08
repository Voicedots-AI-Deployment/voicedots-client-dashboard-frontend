import { apiClient } from './apiClient';
import { collegeApi } from './collegeApi';
export type Subject = { id:string; erp_subject_id:string; code:string; name:string; program_code:string; branch_code:string; year_number:number; semester_number:number };
export type SyllabusItem = { id:string; code:string; title:string; subject_id:string; unit_id?:string };
export type Question = { id:string; subject_id:string; subject_name?:string; question_text:string; question_type:string; marks:number; co_id:string|null; unit_id:string|null; topic_id:string|null; bloom_level:string; difficulty:string; answer:string; options:string[]; source_type:string; source_reference:string; status:string; version:number; created_by:string; updated_by:string; created_at:string; updated_at:string };
export type QuestionVersion = { id:string; version:number; content:Question; previous_content:Question|null; change_reason:string; actor:string; created_at:string };
export const questionTypes = ['MCQ','SHORT_ANSWER','DESCRIPTIVE','NUMERICAL','TRUE_FALSE','FILL_BLANK','OTHER'];
export const blooms = ['K1','K2','K3','K4','K5','K6'];
export const difficulties = ['EASY','MEDIUM','HARD'];
export const statuses = ['DRAFT','NEEDS_REVIEW','APPROVED','ARCHIVED'];
export const sourceTypes = ['MANUAL','EXCEL','CSV','PDF','DOCX','AI_GENERATED','PYQ','OTHER'];
export const qpgApi = {
  upload: async <T,>(subject:string,file:File) => {
    const data=new FormData();data.append('subject_id',subject);data.append('file',file);
    return (await apiClient.post<T>('/v3/college/question-papers/imports',data,{headers:{'Content-Type':'multipart/form-data'},timeout:125000})).data;
  },
  get: <T,>(path:string, signal?:AbortSignal) => collegeApi.get<T>(`question-papers/${path}`,signal),
  save: <T,>(path:string, body:unknown, edit=false) => collegeApi.save<T>(`question-papers/${path}`,body,edit),
};
const bloomNames:Record<string,string>={K1:'K1 — Remember',K2:'K2 — Understand',K3:'K3 — Apply',K4:'K4 — Analyze',K5:'K5 — Evaluate',K6:'K6 — Create'};
export const label = (value:string) => bloomNames[value] || value.replaceAll('_',' ').toLowerCase().replace(/\b\w/g, c=>c.toUpperCase());
