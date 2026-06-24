// src/components/admin/essences/essenceApi.ts
import { axiosInstance } from '../../../../api/axiosInstance.ts';
import { BASE_URL } from '../../../../utils/eNums.ts';

const BASE = `${BASE_URL}/admin/essences`;

export interface Essence {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  allowed_operations: string[];
}

export interface EssenceCreate {
  name: string;
  description?: string | null;
}

export interface EssenceUpdate {
  name?: string;
  description?: string | null;
}

export interface MutationResponse<T> {
  detail: string;
  data: T;
}

export const fetchEssences = async (): Promise<Essence[]> => {
  const res = await axiosInstance.get<Essence[]>(BASE);
  return res.data ?? [];
};

export const createEssence = async (
  body: EssenceCreate,
): Promise<MutationResponse<Essence>> => {
  const res = await axiosInstance.post<MutationResponse<Essence>>(BASE, body);
  return res.data;
};

export const updateEssence = async ({
  id,
  data,
}: {
  id: number;
  data: EssenceUpdate;
}): Promise<MutationResponse<Essence>> => {
  const res = await axiosInstance.patch<MutationResponse<Essence>>(`${BASE}/${id}`, data);
  return res.data;
};

export const deleteEssence = async (id: number): Promise<void> => {
  await axiosInstance.delete(`${BASE}/${id}`);
};
