// src/components/admin/operation_essence_set_links/oeslApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const BASE = `${BASE_URL}/permissions_set`;

export interface OESL {
  id: number;
  operation_id: number;
  operation_name: string;
  essence_set_id: number;
  fingerprint: string;
  essence_names: string[];
  user_group_names: string[];
}

export interface OESLCreate {
  operation_id: number;
  essence_ids: number[];
}

export interface MutationResponse<T> {
  detail: string;
  data: T;
}

export const fetchOESLs = async (): Promise<OESL[]> => {
  const res = await axiosInstance.get<OESL[]>(BASE);
  return res.data ?? [];
};

export const createOESL = async (body: OESLCreate): Promise<MutationResponse<OESL>> => {
  const res = await axiosInstance.post<MutationResponse<OESL>>(BASE, body);
  return res.data;
};

export const deleteOESL = async (id: number): Promise<void> => {
  await axiosInstance.delete(`${BASE}/${id}`);
};

// ── User group grant / revoke (set grain) ──────────────────────────────────────

export const fetchGroupPermissionSets = async (userGroupId: number): Promise<OESL[]> => {
  const res = await axiosInstance.get<OESL[]>(`${BASE}/user_groups/${userGroupId}`);
  return res.data ?? [];
};

export const grantPermissionSetToGroup = async (userGroupId: number, oeslId: number): Promise<void> => {
  await axiosInstance.post(`${BASE}/user_groups/${userGroupId}/${oeslId}`);
};

export const revokePermissionSetFromGroup = async (userGroupId: number, oeslId: number): Promise<void> => {
  await axiosInstance.delete(`${BASE}/user_groups/${userGroupId}/${oeslId}`);
};

export const setGroupPermissionSets = async (userGroupId: number, oeslIds: number[]): Promise<void> => {
  await axiosInstance.put(`${BASE}/user_groups/${userGroupId}`, {
    operation_essence_set_link_ids: oeslIds,
  });
};
