// src/components/admin/job_groups/jobGroupApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const BASE = `${BASE_URL}/job_groups`;

export interface JobGroup {
  id: number;
  name: string;
  key: string;
  description: string | null;
  job_group_type_id: number;
  job_group_type_name: string | null;
  allow_multiple: boolean | null;
}

export interface JobGroupCreate {
  name: string;
  key: string;
  description?: string | null;
  job_group_type_id: number;
}

export interface JobGroupUpdate {
  name?: string;
  key?: string;
  description?: string | null;
  job_group_type_id?: number;
}

export interface MutationResponse<T> {
  detail: string;
  data: T;
}

export const fetchJobGroups = async (): Promise<JobGroup[]> => {
  const res = await axiosInstance.get<JobGroup[]>(BASE);
  return res.data ?? [];
};

export const createJobGroup = async (
  body: JobGroupCreate,
): Promise<MutationResponse<JobGroup>> => {
  const res = await axiosInstance.post<MutationResponse<JobGroup>>(BASE, body);
  return res.data;
};

export const updateJobGroup = async ({
  id,
  data,
}: {
  id: number;
  data: JobGroupUpdate;
}): Promise<MutationResponse<JobGroup>> => {
  const res = await axiosInstance.patch<MutationResponse<JobGroup>>(`${BASE}/${id}`, data);
  return res.data;
};

export const deleteJobGroup = async (id: number): Promise<void> => {
  await axiosInstance.delete(`${BASE}/${id}`);
};
