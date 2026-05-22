// src/components/admin/jobs/jobApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const BASE = `${BASE_URL}/jobs`;
const GROUPS_BASE = `${BASE_URL}/user_groups`;

export interface Job {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  groups: string[]; // group names
}

export interface JobCreate {
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface JobUpdate {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface UserGroup {
  id: number;
  name: string;
  description: string | null;
  is_protected: boolean;
  user_group_type_id: number;
  users_qty?: { active: number; inactive: number } | null;
}

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

// ── Group assignment ──────────────────────────────────────────────────────────

export const fetchUserGroups = async (): Promise<UserGroup[]> => {
  const res = await axiosInstance.get<UserGroup[]>(GROUPS_BASE);
  return res.data ?? [];
};

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
