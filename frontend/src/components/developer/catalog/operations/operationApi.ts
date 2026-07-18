// src/components/admin/operations/operationApi.ts
import { BASE_URL } from '../../../../utils/eNums.ts';
import type { MutationResponse } from '../../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../../api/createCrudApi';

const BASE = `${BASE_URL}/operations`;

export interface Operation {
  id: number;
  name: string;
  description: string | null;
  user_groups: string[];
}

export interface OperationCreate {
  name: string;
  description?: string | null;
}

export interface OperationUpdate {
  name?: string;
  description?: string | null;
}

const crud = createCrudApi<Operation, OperationCreate, OperationUpdate>(BASE);

export const fetchOperations = crud.fetchList;

export const createOperation = crud.create;

export const updateOperation = crud.update;

export const deleteOperation = crud.remove;
