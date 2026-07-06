// src/components/developer/audit_log/auditApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

// ── Types (mirror backend ChangeSessionSchema / ChangeLogSchema) ──────────────

export type ChangeSource = 'manual' | 'system';
export type ChangeRunStatus = 'running' | 'success' | 'failed';
export type ChangeAction =
    | 'create'
    | 'update'
    | 'delete'
    | 'apply'
    | 'status_change'
    | 'revert';

export interface ChangeSessionUser {
    id: number;
    name: string;
    code: string | null;
}

export interface ChangeSession {
    id: number;
    source: ChangeSource;
    triggered_by_user_id: number | null;
    task_name: string | null;
    status: ChangeRunStatus;
    summary: Record<string, unknown> | null;
    started_at: string;
    finished_at: string | null;
    triggered_by: ChangeSessionUser | null;
    employee_id: number | null;
    employee: ChangeSessionUser | null;
}

// Field-level before/after: { field: { old, new } }
export type ChangeDiff = Record<string, { old: unknown; new: unknown }>;

export interface ChangeLog {
    id: number;
    change_session_id: number;
    parent_id: number | null;
    essence_key: string;
    entity_id: number | null;
    action: ChangeAction;
    changes: ChangeDiff | null;
    created_at: string;
    employee_id: number | null;
    employee: ChangeSessionUser | null;
}

// ── Filters ───────────────────────────────────────────────────────────────────

export interface ChangeSessionFilters {
    source?: ChangeSource | null;
    status?: ChangeRunStatus | null;
    limit?: number | null;
}

// ── API calls ─────────────────────────────────────────────────────────────────

const SESSIONS = `${BASE_URL}/audit/change_sessions`;

export const fetchChangeSessions = async (
    filters: ChangeSessionFilters = {},
): Promise<ChangeSession[]> => {
    const params: Record<string, string | number> = {};
    if (filters.source) params.source = filters.source;
    if (filters.status) params.status = filters.status;
    if (filters.limit) params.limit = filters.limit;
    const res = await axiosInstance.get<ChangeSession[]>(SESSIONS, { params });
    return res.data ?? [];
};

// All change_log rows for one run (chronological). The page nests children
// under their parent via parent_id.
export const fetchChangeSessionLogs = async (
    id: number,
): Promise<ChangeLog[]> => {
    const res = await axiosInstance.get<ChangeLog[]>(`${SESSIONS}/${id}/logs`);
    return res.data ?? [];
};

