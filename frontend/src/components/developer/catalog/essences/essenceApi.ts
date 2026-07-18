// src/components/admin/essences/essenceApi.ts
import { BASE_URL } from '../../../../utils/eNums.ts';
import type { MutationResponse } from '../../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../../api/createCrudApi';

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

const crud = createCrudApi<Essence, EssenceCreate, EssenceUpdate>(BASE);

export const fetchEssences = crud.fetchList;

export const createEssence = crud.create;

export const updateEssence = crud.update;

export const deleteEssence = crud.remove;
