// src/components/admin/talent-statuses/talentStatusApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import {BASE_URL} from "../../../utils/eNums.ts"
const BASE = `${BASE_URL}/admin/talent-statuses`;

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

export interface MutationResponse<T> {
  detail: string;
  data: T;
}

export const fetchTalentStatuses = async (): Promise<TalentStatus[]> => {
  const res = await axiosInstance.get<TalentStatus[]>(BASE);
  return res.data ?? [];
};

export const createTalentStatus = async (
  body: TalentStatusCreate,
): Promise<MutationResponse<TalentStatus>> => {
  const res = await axiosInstance.post<MutationResponse<TalentStatus>>(BASE, body);
  return res.data;
};

export const updateTalentStatus = async ({
  id,
  data,
}: {
  id: number;
  data: TalentStatusUpdate;
}): Promise<MutationResponse<TalentStatus>> => {
  const res = await axiosInstance.patch<MutationResponse<TalentStatus>>(`${BASE}/${id}`, data);
  return res.data;
};

export const deleteTalentStatus = async (id: number): Promise<MutationResponse<null>> => {
  const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
  return res.data;
};