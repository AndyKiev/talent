// src/components/developer/security/permissions_overview/permissionManifestApi.ts
import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums';

const BASE = `${BASE_URL}/admin/permission_manifest`;

export const PERMISSION_MANIFEST_QK = ['permission_manifest'];

export interface PermissionRef {
    operation: string;
    essences: string[];
}

export interface EndpointEntry {
    method: string;
    path: string;
    name: string;
    summary: string;
    permissions: PermissionRef[];
}

export interface PermissionEntry {
    key: string;
    operation: string;
    essences: string[];
    endpoint_count: number;
    endpoints: string[];
}

export interface SeedDiff {
    missing_operations: string[];
    missing_essences: string[];
}

export interface ManifestSummary {
    guarded_endpoints: number;
    unguarded_endpoints: number;
    distinct_permissions: number;
}

export interface PermissionManifest {
    summary: ManifestSummary;
    seed: SeedDiff;
    permissions: PermissionEntry[];
    endpoints: EndpointEntry[];
}

export const fetchPermissionManifest = async (): Promise<PermissionManifest> => {
    const res = await axiosInstance.get<PermissionManifest>(BASE);
    return res.data;
};
