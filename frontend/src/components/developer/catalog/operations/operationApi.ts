// src/components/admin/operations/operationApi.ts
import { axiosInstance } from '../../../../api/axiosInstance.ts';
import { BASE_URL } from '../../../../utils/eNums.ts';

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

export interface MutationResponse<T> {
  detail: string;
  data: T;
}

export const fetchOperations = async (): Promise<Operation[]> => {
  const res = await axiosInstance.get<Operation[]>(BASE);
  return res.data ?? [];
};

export const createOperation = async (
  body: OperationCreate,
): Promise<MutationResponse<Operation>> => {
  const res = await axiosInstance.post<MutationResponse<Operation>>(BASE, body);
  return res.data;
};

export const updateOperation = async ({
  id,
  data,
}: {
  id: number;
  data: OperationUpdate;
}): Promise<MutationResponse<Operation>> => {
  const res = await axiosInstance.patch<MutationResponse<Operation>>(`${BASE}/${id}`, data);
  return res.data;
};

export const deleteOperation = async (id: number): Promise<void> => {
  await axiosInstance.delete(`${BASE}/${id}`);
};
