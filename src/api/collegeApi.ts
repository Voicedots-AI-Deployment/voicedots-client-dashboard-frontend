import axios from 'axios';
import { apiClient } from './apiClient';
export type CollegeAccess = { enabled: boolean; college_name?: string };
export type Drive = { id: string; company_name: string; role_title: string; status: string; job_type?: string; location?: string; jd_raw_text?: string; window_start_at?: string; window_end_at?: string; interview_duration_minutes?: number; criteria_min_cgpa?: number; criteria_department_codes?: string[]; criteria_programs?: string[]; criteria_graduation_years?: number[]; latest_snapshot_eligible_count?: number; assignment_count?: number };
export type CollegeStudent = { id: string; full_name: string; email: string; roll_number: string; phone?: string; program: string; department_code: string; graduation_year: number; cgpa?: number; status: string };
export type Program = { code: string; display_name: string; duration_years: number; departments: { code: string; display_name: string }[] };
export const collegeApi = {
  get: async <T,>(path: string, signal?: AbortSignal) => (await apiClient.get<T>(`/v3/college/${path}`, { signal })).data,
  save: async <T,>(path: string, body: unknown, edit = false) => (await apiClient.request<T>({ url: `/v3/college/${path}`, method: edit ? 'PUT' : 'POST', data: body, timeout: 125000 })).data,
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
