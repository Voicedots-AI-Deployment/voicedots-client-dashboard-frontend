import axios from 'axios';
import { apiClient } from './apiClient';
export type CollegeAccess = { enabled: boolean; college_id?:string; college_name?: string };
export type RoundConfiguration = {track:string;question_source:'personalized'|'manual'|'ai_generated';questions:string[]};
export type Drive = { is_locked?:boolean; agent_selection?: import("@/pages/dashboard/interviewAgentTypes").Selection[]; question_source?: string; scripted_questions?: Record<string, string[]>; round_configuration?:RoundConfiguration[]; id: string; company_name: string; company_description?: string; company_website?:string;company_linkedin?:string;drive_type?:'official_placement'|'college_practice';difficulty_tier?:'beginner'|'intermediate'|'advanced'; role_title: string; status: string; job_type?: string; location?: string; package_min_lpa?:number;package_max_lpa?:number;package_currency?:string; jd_raw_text?: string; window_start_at?: string; window_end_at?: string; interview_duration_minutes?: number; max_attempts?: number; criteria_min_cgpa?: number; criteria_department_codes?: string[]; criteria_programs?: string[]; criteria_graduation_years?: number[]; latest_snapshot_eligible_count?: number; assignment_count?: number;started_count?:number;completed_count?:number;created_at?:string };
export type CollegeStudent = { has_photo?:boolean;batch_label?:string; attendance?:{attempts:number;completed:number;last_attended_at:string|null}; id: string; full_name: string; email: string; roll_number: string; phone?: string; program: string; department_code: string; graduation_year: number; cgpa?: number; status: string };
export type Program = { code: string; display_name: string; duration_years: number; departments: { code: string; display_name: string }[] };
export const collegeApi = {
  remove: async (path: string) => (await apiClient.delete(`/v3/college/${path}`)).data,
  get: async <T,>(path: string, signal?: AbortSignal) => (await apiClient.get<T>(`/v3/college/${path}`, { signal })).data,
  audio: async (path: string) => URL.createObjectURL((await apiClient.get(`/v3/college/${path}`, { responseType: 'blob' })).data),
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
