// src/components/admin/talent-statuses/talentStatusApi.ts
import {BASE_URL} from "../../../utils/eNums.ts"
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';
const BASE = `${BASE_URL}/admin/talent_statuses`;

export interface TalentStatus {
  id: number;
  key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TalentStatusCreate {
  key: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface TalentStatusUpdate {
  key?: string;
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

const crud = createCrudApi<TalentStatus, TalentStatusCreate, TalentStatusUpdate>(BASE);

export const fetchTalentStatuses = crud.fetchList;

export const createTalentStatus = crud.create;

export const updateTalentStatus = crud.update;

export const deleteTalentStatus = crud.remove;