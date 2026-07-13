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

export interface ProcessRoleLinkInfo {
  short: string;  // role short_name (or name) — compact chip label
  full: string;   // "process / role" — tooltip
  department_types: string[];  // oversight-target type names (tooltip list)
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
  process_role_links_info: ProcessRoleLinkInfo[];  // role links (short chip + full tooltip)
  department_type_links: DepartmentTypeLinkInfo[];  // dept types + link is_active
  job_category_id: number | null;     // 1:1 category (via job_job_category_links)
  job_category_key: string | null;    // snake_case key; label = getString(snakeToCamel(key))
  recommended_training_names: string[];  // training types that recommend this job (by_job link)
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

// ── Job category assignment (1:1 link, upsert) ───────────────────────────────

const JOB_JOB_CATEGORY_LINKS_BASE = `${BASE_URL}/job_job_category_links`;

export const setJobCategoryForJob = async ({
  jobId,
  jobCategoryId,
}: {
  jobId: number;
  jobCategoryId: number;
}): Promise<MutationResponse<unknown>> => {
  // PUT /job_job_category_links/job/{jobId} — replaces the single category link.
  const res = await axiosInstance.put<MutationResponse<unknown>>(
    `${JOB_JOB_CATEGORY_LINKS_BASE}/job/${jobId}`,
    { job_category_id: jobCategoryId },
  );
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

// ── Recommended trainings (many-to-many, by-job link, viewed from the job side)

const TRAINING_TYPE_JOB_LINKS_BASE = `${BASE_URL}/training_type_job_links`;

export interface TrainingTypeJobLink {
  id: number;
  training_type_id: number;
  job_id: number;
  created_at: string;
  job_name: string | null;
  training_type_name: string | null;
}

export const setTrainingTypesForJob = async ({
  jobId,
  trainingTypeIds,
}: {
  jobId: number;
  trainingTypeIds: number[];
}): Promise<MutationResponse<unknown>> => {
  // PUT /training_type_job_links/job/{jobId} — replaces all training types
  // recommending this job atomically (reverse side of the training-type PUT).
  const res = await axiosInstance.put<MutationResponse<unknown>>(
    `${TRAINING_TYPE_JOB_LINKS_BASE}/job/${jobId}`,
    { training_type_ids: trainingTypeIds },
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
  // Oversight targets: dept types whose EMPLOYEES this job+role oversees
  // (NOT the staffing types the job is linked to).
  department_type_ids: number[];
  department_type_names: string[];
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
  department_type_ids?: number[];
}): Promise<MutationResponse<JobProcessRoleLink>> => {
  const res = await axiosInstance.post<MutationResponse<JobProcessRoleLink>>(
    JOB_PROCESS_ROLE_LINKS_BASE,
    body,
  );
  return res.data;
};

export const setJobProcessRoleLinkDepartmentTypes = async (
  linkId: number,
  departmentTypeIds: number[],
): Promise<MutationResponse<JobProcessRoleLink>> => {
  const res = await axiosInstance.put<MutationResponse<JobProcessRoleLink>>(
    `${JOB_PROCESS_ROLE_LINKS_BASE}/${linkId}/department_types`,
    { department_type_ids: departmentTypeIds },
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