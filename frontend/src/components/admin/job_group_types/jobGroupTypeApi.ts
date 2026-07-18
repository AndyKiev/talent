// src/components/admin/job_group_types/jobGroupTypeApi.ts
import { BASE_URL } from '../../../utils/eNums';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

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

const crud = createCrudApi<JobGroupType, JobGroupTypeCreate, JobGroupTypeUpdate>(BASE);

export const fetchJobGroupTypes = crud.fetchList;

export const createJobGroupType = crud.create;

export const updateJobGroupType = crud.update;

export const deleteJobGroupType = crud.remove;
