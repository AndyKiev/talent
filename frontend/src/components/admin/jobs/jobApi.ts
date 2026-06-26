// src/components/admin/jobs/jobApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const BASE = `${BASE_URL}/jobs`;
// const USER_GROUPS_BASE = `${BASE_URL}/user_groups`;
const JOB_JOB_GROUP_LINKS_BASE = `${BASE_URL}/job_job_group_links`;

export interface DepartmentTypeLinkInfo {
  name: string;
  is_active: boolean;
}

export interface Job {
  id: number;
  name: string;
  short_name: string | null;
  key: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  groups: string[];           // user group names (existing)
  job_group_names: string[];  // job group names (new)
  process_role_link_names: string[];  // "process_name / role_name" per link
  department_type_links: DepartmentTypeLinkInfo[];  // dept types + link is_active
}

export interface JobCreate {
  name: string;
  short_name?: string | null;
  key?: string | null;
  description?: string | null;
  is_active: boolean;
}

export interface JobUpdate {
  name?: string;
  short_name?: string | null;
  key?: string | null;
  description?: string | null;
  is_active?: boolean;
}
export interface JobBulkUploadResult {
  detail: string;
  inserted: Job[];
  skipped_names: string[];
  skipped_descriptions: string[];
  inserted_count: number;
  skipped_count: number;
}


// UserGroup kept here for the existing user-group assignment dialog
// export interface UserGroup {
//   id: number;
//   name: string;
//   description: string | null;
//   is_protected: boolean;
//   user_group_type_id: number;
//   users_qty?: { active: number; inactive: number } | null;
// }

export interface MutationResponse<T> {
  detail: string;
  data: T;
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export const fetchJobs = async (): Promise<Job[]> => {
  const res = await axiosInstance.get<Job[]>(BASE);
  return res.data ?? [];
};

export const createJob = async (
  body: JobCreate,
): Promise<MutationResponse<Job>> => {
  const res = await axiosInstance.post<MutationResponse<Job>>(BASE, body);
  return res.data;
};

export const updateJob = async ({
  id,
  data,
}: {
  id: number;
  data: JobUpdate;
}): Promise<MutationResponse<Job>> => {
  const res = await axiosInstance.patch<MutationResponse<Job>>(`${BASE}/${id}`, data);
  return res.data;
};

export const deleteJob = async (id: number): Promise<MutationResponse<null>> => {
  const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
  return res.data;
};

// // ── User-group assignment (existing) ─────────────────────────────────────────
//
// export const fetchUserGroups = async (): Promise<UserGroup[]> => {
//   const res = await axiosInstance.get<UserGroup[]>(USER_GROUPS_BASE);
//   return res.data ?? [];
// };

export const setJobGroups = async ({
  jobId,
  groupIds,
}: {
  jobId: number;
  groupIds: number[];
}): Promise<Job> => {
  const res = await axiosInstance.put<Job>(`${BASE}/${jobId}/groups`, {
    group_ids: groupIds,
  });
  return res.data;
};

// ── Job-group assignment (new) ────────────────────────────────────────────────

export const setJobJobGroups = async ({
  jobId,
  jobGroupIds,
}: {
  jobId: number;
  jobGroupIds: number[];
}): Promise<unknown> => {
  // PUT /job_job_group_links/job/{jobId} — replaces all links atomically
  const res = await axiosInstance.put(`${JOB_JOB_GROUP_LINKS_BASE}/job/${jobId}`, {
    job_group_ids: jobGroupIds,
  });
  return res.data;
};

export const bulkUploadJobs = async (file: File): Promise<JobBulkUploadResult> => {
  const form = new FormData();
  form.append('file', file);
  const res = await axiosInstance.post<JobBulkUploadResult>(
      `${BASE}/bulk_upload`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data;
};

// ── Process-role assignment ──────────────────────────────────────────────────

const JOB_PROCESS_ROLE_LINKS_BASE = `${BASE_URL}/job_process_role_links`;

export interface JobProcessRoleLink {
  id: number;
  job_id: number;
  process_role_id: number;
  created_at: string;
  job_name: string | null;
  process_name: string | null;
  role_name: string | null;
}

export const fetchJobProcessRoleLinks = async (
  jobId: number,
): Promise<JobProcessRoleLink[]> => {
  const res = await axiosInstance.get<JobProcessRoleLink[]>(
    `${JOB_PROCESS_ROLE_LINKS_BASE}/job/${jobId}`,
  );
  return res.data ?? [];
};

export const createJobProcessRoleLink = async (body: {
  job_id: number;
  process_role_id: number;
}): Promise<MutationResponse<JobProcessRoleLink>> => {
  const res = await axiosInstance.post<MutationResponse<JobProcessRoleLink>>(
    JOB_PROCESS_ROLE_LINKS_BASE,
    body,
  );
  return res.data;
};

export const deleteJobProcessRoleLink = async (
  jobId: number,
  processRoleId: number,
): Promise<void> => {
  await axiosInstance.delete(
    `${JOB_PROCESS_ROLE_LINKS_BASE}/job/${jobId}/process_role/${processRoleId}`,
  );
};