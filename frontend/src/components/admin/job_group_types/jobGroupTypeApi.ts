// src/components/admin/job_group_types/jobGroupTypeApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const BASE = `${BASE_URL}/job_group_types`;

export interface JobGroupType {
  id: number;
  name: string;
  key: string;
  description: string | null;
  allow_multiple: boolean;
  created_at: string;
  groups: string[]; // Names of JobGroups linked to this type
}

export interface JobGroupTypeCreate {
  name: string;
  key: string;
  description?: string | null;
  allow_multiple: boolean;
}

export interface JobGroupTypeUpdate {
  name?: string;
  key?: string;
  description?: string | null;
  allow_multiple?: boolean;
}

export interface MutationResponse<T> {
  detail: string;
  data: T;
}

export const fetchJobGroupTypes = async (): Promise<JobGroupType[]> => {
  const res = await axiosInstance.get<JobGroupType[]>(BASE);
  return res.data ?? [];
};

export const createJobGroupType = async (
  body: JobGroupTypeCreate,
): Promise<MutationResponse<JobGroupType>> => {
  const res = await axiosInstance.post<MutationResponse<JobGroupType>>(BASE, body);
  return res.data;
};

export const updateJobGroupType = async ({
  id,
  data,
}: {
  id: number;
  data: JobGroupTypeUpdate;
}): Promise<MutationResponse<JobGroupType>> => {
  const res = await axiosInstance.patch<MutationResponse<JobGroupType>>(`${BASE}/${id}`, data);
  return res.data;
};

export const deleteJobGroupType = async (id: number): Promise<void> => {
  await axiosInstance.delete(`${BASE}/${id}`);
};
