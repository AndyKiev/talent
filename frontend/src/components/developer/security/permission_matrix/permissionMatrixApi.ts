// src/components/developer/security/permission_matrix/permissionMatrixApi.ts
//
// The BA permission matrix reuses two existing data sources as its single
// source of truth:
//   - rows    = GET /permissions_set            (fetchOESLs)         -> OESL[]
//   - columns = GET /admin/user_groups          (fetchUserGroups)    -> UserGroup[]
//               each group already carries `oesl_ids` = its current grants.
//
// No new read endpoints are needed. The grid produces a downloadable JSON
// (full desired state per group) that maps 1:1 to POST /permissions_set/apply_matrix.
//
// NOTE: the OESL + user-group CRUD components remain under components/admin/...
// (they back the admin user-groups group card too), so these two data sources
// are imported across into admin rather than duplicated.
import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums';
import { fetchOESLs, type OESL } from '../operation_essence_set_links/oeslApi';
import { fetchUserGroups, type UserGroup } from '../../../admin/user_groups/userGroupApi';

export { fetchOESLs, fetchUserGroups };
export type { OESL, UserGroup };

const BASE = `${BASE_URL}/permissions_set`;

/** Current user (from /jwt/users/me) — used to gate admin-only controls. */
export interface CurrentUser {
  groups: string[];
  is_bypass: boolean;
}

export const fetchCurrentUser = async (): Promise<CurrentUser> => {
  const res = await axiosInstance.get(`${BASE_URL}/jwt/users/me`);
  return {
    groups: res.data?.groups ?? [],
    is_bypass: Boolean(res.data?.is_bypass),
  };
};

/** One group's full desired permission set (full-replace). */
export interface MatrixGroupGrants {
  user_group_id: number;
  user_group_name: string;
  operation_essence_set_link_ids: number[];
}

/** The downloadable file shape. */
export interface MatrixExport {
  generated_at: string;
  groups: MatrixGroupGrants[];
}

// -- sync from code (materialise guard permissions into permissions_set) -------

export interface PermissionSyncSkip {
  operation: string;
  essences: string[];
  reason: string;
}

export interface PermissionSyncResult {
  total_required: number;
  created: number;
  existing: number;
  skipped: PermissionSyncSkip[];
}

export const syncPermissionsFromRoutes = async (): Promise<PermissionSyncResult> => {
  const res = await axiosInstance.post<PermissionSyncResult>(`${BASE}/sync_from_routes`);
  return res.data;
};

/** Build the export object from the current grid state. */
export const buildMatrixExport = (
  groups: { id: number; name: string }[],
  draft: Record<number, Set<number>>,
): MatrixExport => ({
  generated_at: new Date().toISOString(),
  groups: groups.map((g) => ({
    user_group_id: g.id,
    user_group_name: g.name,
    operation_essence_set_link_ids: Array.from(draft[g.id] ?? new Set<number>()).sort(
      (a, b) => a - b,
    ),
  })),
});
