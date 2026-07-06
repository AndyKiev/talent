// src/components/employees/talent_audit/talentAuditApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const BASE = `${BASE_URL}`;

// ── Shared ────────────────────────────────────────────────────────────────────

export interface MutationResponse<T> {
  detail: string;
  data: T;
}

// ── TalentAudit ───────────────────────────────────────────────────────────────

export interface TalentAudit {
  id: number;
  employee_id: number;
  status_id: number;
  talent_plus: boolean;
  created_by: number;
  created_at: string;
}

export interface TalentAuditCreate {
  employee_id: number;
  status_id: number;
}

export const fetchTalentAuditByEmployee = async (
  employeeId: number,
): Promise<TalentAudit | null> => {
  const res = await axiosInstance.get<TalentAudit[]>(`${BASE}/talent_audits`);
  const all = res.data ?? [];
  return all.find((a) => a.employee_id === employeeId) ?? null;
};

export const createTalentAudit = async (
  body: TalentAuditCreate,
): Promise<MutationResponse<TalentAudit>> => {
  const res = await axiosInstance.post<MutationResponse<TalentAudit>>(
    `${BASE}/talent_audits`,
    body,
  );
  return res.data;
};

// ── TalentAuditJob (enriched from backend) ────────────────────────────────────

export interface TalentAuditJob {
  id: number;
  talent_audit_id: number;
  target_job_id: number;
  status_id: number;
  talent_status_period_link_id: number;
  created_by: number;
  created_at: string;
  // Enriched
  job_name?: string;
  status_name?: string;
  hrm_status_period_label?: string;
}

export interface TalentAuditJobCreate {
  talent_audit_id: number;
  target_job_id: number;
  status_id: number;
  talent_status_period_link_id: number;
}

export const fetchTalentAuditJobsByAudit = async (
  talentAuditId: number,
): Promise<TalentAuditJob[]> => {
  const res = await axiosInstance.get<TalentAuditJob[]>(
    `${BASE}/talent_audit_jobs/by_talent_audit/${talentAuditId}`,
  );
  return res.data ?? [];
};

export const createTalentAuditJob = async (
  body: TalentAuditJobCreate,
): Promise<MutationResponse<TalentAuditJob>> => {
  const res = await axiosInstance.post<MutationResponse<TalentAuditJob>>(
    `${BASE}/talent_audit_jobs`,
    body,
  );
  return res.data;
};

export const deleteTalentAuditJob = async (id: number): Promise<void> => {
  await axiosInstance.delete(`${BASE}/talent_audit_jobs/${id}`);
};

// ── TalentAuditJob status (manual change) ─────────────────────────────────────

export interface TalentAuditJobStatus {
  id: number;
  name: string;
  key: string;
  description?: string | null;
}

export const fetchTalentAuditJobStatuses = async (): Promise<
  TalentAuditJobStatus[]
> => {
  const res = await axiosInstance.get<TalentAuditJobStatus[]>(
    `${BASE}/talent_audit_job_statuses`,
  );
  return res.data ?? [];
};

export const updateTalentAuditJobStatus = async (
  id: number,
  statusId: number,
): Promise<MutationResponse<TalentAuditJob>> => {
  const res = await axiosInstance.patch<MutationResponse<TalentAuditJob>>(
    `${BASE}/talent_audit_jobs/${id}`,
    { status_id: statusId },
  );
  return res.data;
};

// ── Free jobs for interview ───────────────────────────────────────────────────

export interface FreeAuditJob {
  id: number;
  target_job_id: number;
  job_name: string;
  hrm_status_period_label: string;
  hrm_qty_months: number;
  hrm_status_key: string;
  hrm_talent_status_period_link_id: number;
}

export const fetchFreeAuditJobs = async (
  talentAuditId: number,
): Promise<FreeAuditJob[]> => {
  const res = await axiosInstance.get<FreeAuditJob[]>(
    `${BASE}/talent_audit_interviews/free_jobs/${talentAuditId}`,
  );
  return res.data ?? [];
};

// ── TalentAuditInterview ──────────────────────────────────────────────────────

export interface TalentAuditInterviewJobItem {
  id: number;
  talent_audit_interview_id: number;
  talent_audit_job_id: number;
  talent_status_period_link_id: number;
  created_by: number;
  created_at: string;
  // Enriched (optional — may come from backend or be resolved client-side)
  job_name?: string;
  hrm_status_period_label?: string;
  hrs_status_period_label?: string;
}

export interface TalentAuditInterview {
  id: number;
  talent_audit_id: number;
  status_id: number;
  interview_date: string;
  created_by: number;
  created_at: string;
  interview_jobs: TalentAuditInterviewJobItem[];
}

export interface JobAssessmentPayload {
  talent_audit_job_id: number;
  talent_status_period_link_id: number;
}

export interface TalentAuditInterviewCreate {
  talent_audit_id: number;
  status_id: number;
  interview_date: string;
  job_assessments: JobAssessmentPayload[];
}

export const fetchInterviewsByAudit = async (
  talentAuditId: number,
): Promise<TalentAuditInterview[]> => {
  const res = await axiosInstance.get<TalentAuditInterview[]>(
    `${BASE}/talent_audit_interviews/by_talent_audit/${talentAuditId}`,
  );
  return res.data ?? [];
};

export const createTalentAuditInterview = async (
  body: TalentAuditInterviewCreate,
): Promise<MutationResponse<TalentAuditInterview>> => {
  const res = await axiosInstance.post<MutationResponse<TalentAuditInterview>>(
    `${BASE}/talent_audit_interviews`,
    body,
  );
  return res.data;
};

export const deleteTalentAuditInterview = async (id: number): Promise<void> => {
  await axiosInstance.delete(`${BASE}/talent_audit_interviews/${id}`);
};
