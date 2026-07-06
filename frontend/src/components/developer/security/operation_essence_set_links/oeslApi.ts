// src/components/admin/operation_essence_set_links/oeslApi.ts
import { axiosInstance } from '../../../../api/axiosInstance.ts';
import { BASE_URL } from '../../../../utils/eNums.ts';

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

// ── Permission-matrix apply (ingest the BA's downloaded JSON) ──────────────────

export interface MatrixGroupGrants {
  user_group_id: number;
  user_group_name?: string;
  operation_essence_set_link_ids: number[];
}

export interface MatrixGroupDiff {
  user_group_id: number;
  user_group_name: string | null;
  added: number[];
  removed: number[];
  unchanged: number;
  unknown_ids: number[];
  applied: boolean;
}

export interface MatrixApplyResult {
  dry_run: boolean;
  groups: MatrixGroupDiff[];
  total_added: number;
  total_removed: number;
  total_unknown: number;
}

/**
 * Apply a permission-matrix file (full desired state per group).
 * dryRun=true returns a preview diff without writing; dryRun=false commits.
 */
export const applyPermissionMatrix = async (
  groups: MatrixGroupGrants[],
  dryRun: boolean,
): Promise<MatrixApplyResult> => {
  const res = await axiosInstance.post<MatrixApplyResult>(
    `${BASE}/apply_matrix?dry_run=${dryRun}`,
    { groups },
  );
  return res.data;
};
