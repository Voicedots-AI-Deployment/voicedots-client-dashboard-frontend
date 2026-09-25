import axios from 'axios';
import { apiClient } from './apiClient';
export type CollegeAccess = { enabled: boolean; college_id?:string; college_name?: string; timezone?:string };
export type RoundConfiguration = {track:string;question_source:'personalized'|'manual'|'ai_generated';questions:string[]};
export type Drive = { is_creation_draft?:boolean; company_profile_id?:string|null; salary_min_amount?:number|null; salary_max_amount?:number|null; salary_currency?:string; salary_period?:'annual'|'monthly'; salary_type?:'fixed'|'range'; is_locked?:boolean; agent_selection?: import("@/pages/dashboard/interviewAgentTypes").Selection[]; question_source?: string; scripted_questions?: Record<string, string[]>; round_configuration?:RoundConfiguration[]; id: string; company_name: string; company_description?: string; company_website?:string;company_linkedin?:string;drive_type?:'official_placement'|'college_practice';difficulty_tier?:'beginner'|'intermediate'|'advanced'; role_title: string; status: string; job_type?: string; location?: string; package_min_lpa?:number;package_max_lpa?:number;package_currency?:string; drive_date?:string; application_deadline?:string; jd_raw_text?: string; window_start_at?: string; window_end_at?: string; interview_duration_minutes?: number; max_attempts?: number; criteria_min_cgpa?: number; criteria_department_codes?: string[]; criteria_programs?: string[]; criteria_graduation_years?: number[]; latest_snapshot_eligible_count?: number; assignment_count?: number;started_count?:number;completed_count?:number;created_at?:string };
export type CollegeStudent = { has_photo?:boolean;batch_label?:string;date_of_birth?:string|null; attendance?:{attempts:number;completed:number;last_attended_at:string|null}; id: string; full_name: string; email: string; roll_number: string; phone?: string; program: string; department_code: string; graduation_year: number; cgpa?: number; status: string };
export type Program = { code: string; display_name: string; duration_years: number; departments: { code: string; display_name: string }[] };
export const collegeApi = {
  remove: async (path: string) => (await apiClient.delete(`/v3/college/${path}`)).data,
  get: async <T,>(path: string, signal?: AbortSignal) => (await apiClient.get<T>(`/v3/college/${path}`, { signal })).data,
  audio: async (path: string) => URL.createObjectURL((await apiClient.get(`/v3/college/${path}`, { responseType: 'blob' })).data),
  file: async (path: string) => (await apiClient.get(`/v3/college/${path}`, { responseType: 'blob' })).data as Blob,
  save: async <T,>(path: string, body: unknown, edit = false) => {
    let data = body;
    if (path === 'drives' && !edit && body && typeof body === 'object') {
      const storageKey = 'voicedots_create_drive_idempotency';
      const suppliedKey = (body as Record<string, unknown>).idempotency_key;
      const idempotencyKey = typeof suppliedKey === 'string' && suppliedKey.length >= 16
        ? suppliedKey
        : sessionStorage.getItem(storageKey) || crypto.randomUUID();
      sessionStorage.setItem(storageKey, idempotencyKey);
      data = { ...(body as Record<string, unknown>), idempotency_key: idempotencyKey };
    }
    const result = (await apiClient.request<T>({ url: `/v3/college/${path}`, method: edit ? 'PUT' : 'POST', data, timeout: 125000 })).data;
    if (path === 'drives' && !edit) sessionStorage.removeItem('voicedots_create_drive_idempotency');
    return result;
  },
};
export function collegeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(item => item.msg || 'Invalid input').join('. ');
    if (detail?.message) return detail.message + (detail.missing_fields ? `: ${detail.missing_fields.join(', ')}` : '');
    if (detail) return JSON.stringify(detail);
  }
  return 'Unable to complete the request. Please try again.';
}

export type CollegeFieldProblem = { field: string; step?: number; message: string };

export function collegeFieldErrors(error: unknown): CollegeFieldProblem[] {
  if (!axios.isAxiosError(error)) return [];
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map(item => {
    const message = String(item.msg || "Invalid value");
    let field = String(item.loc?.at(-1) || "form");
    if (field === "body" || field === "form") {
      if (/currency/i.test(message)) field = "salary_currency";
      else if (/salary|compensation|amount|range|maximum|minimum|fixed/i.test(message)) field = "salary_max_amount";
    }
    return { field, message };
  });
  if (!detail || typeof detail !== "object") return [];
  if (typeof detail.field === "string" && typeof detail.message === "string") return [{ field: detail.field, step: Number.isInteger(detail.step) ? detail.step : undefined, message: detail.message }];
  if (Array.isArray(detail.errors)) return detail.errors.filter((item:unknown) => item && typeof item === "object" && "field" in item && "message" in item).map((item:any) => ({ field: String(item.field), step: Number.isInteger(item.step) ? item.step : undefined, message: String(item.message) }));
  if (Array.isArray(detail.missing_fields)) return detail.missing_fields.map((field:string) => ({ field, message: "This field is required." }));
  return [];
}
