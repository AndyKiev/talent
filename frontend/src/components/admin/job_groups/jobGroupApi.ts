// src/components/admin/job_groups/jobGroupApi.ts
import { BASE_URL } from '../../../utils/eNums';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

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

const crud = createCrudApi<JobGroup, JobGroupCreate, JobGroupUpdate>(BASE);

export const fetchJobGroups = crud.fetchList;

export const createJobGroup = crud.create;

export const updateJobGroup = crud.update;

export const deleteJobGroup = crud.remove;
