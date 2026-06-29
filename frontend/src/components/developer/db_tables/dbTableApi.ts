// src/components/developer/db_tables/dbTableApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';

const BASE = `${BASE_URL}/developer/db_tables`;

// ── Types (mirroring the backend Pydantic schemas) ──────────────────────────

export interface FkRef {
    table: string;
    column: string;
}

export interface ColumnInfo {
    name: string;
    data_type: string;
    nullable: boolean;
    is_primary_key: boolean;
    is_foreign_key: boolean;
    fk_ref: FkRef | null;
    max_length: number | null;
}

export interface TableStats {
    row_count: number;
    size_bytes: number;
    size_pretty: string;
}

export interface DbTableInfo {
    table_name: string;
    sort_order: number;
    description_ru: string;
    sample_limit: number;
    columns: ColumnInfo[];
    current: TableStats;
    previous: TableStats;
    restore_row_count: number; // rows for this table in the latest local backup
}

export interface TableDataFile {
    tables: DbTableInfo[];
}

export interface BackupResult {
    generated_at: string;
    total_rows: number;
    table_count: number;
    files: Record<string, string[]>; // { filename: [table_name, ...] }
}

export interface DbTableInfoUpdate {
    description_ru?: string;
    sort_order?: number;
    sample_limit?: number;
}

export interface TableRowsResponse {
    columns: string[];
    column_meta: ColumnInfo[];
    rows: (string | number | boolean | null)[][];
    total_available: number;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

// ── API functions ───────────────────────────────────────────────────────────

export const fetchDbTables = async (): Promise<TableDataFile> => {
    const res = await axiosInstance.get<TableDataFile>(BASE);
    return res.data;
};

export const refreshDbTables = async (): Promise<TableDataFile> => {
    const res = await axiosInstance.post<TableDataFile>(`${BASE}/refresh`);
    return res.data;
};

export const backupDbTables = async (): Promise<BackupResult> => {
    const res = await axiosInstance.post<BackupResult>(`${BASE}/backup`);
    return res.data;
};

export const updateDbTable = async (
    tableName: string,
    data: DbTableInfoUpdate,
): Promise<MutationResponse<DbTableInfo>> => {
    const res = await axiosInstance.patch<MutationResponse<DbTableInfo>>(
        `${BASE}/${encodeURIComponent(tableName)}`,
        data,
    );
    return res.data;
};

export const reorderDbTables = async (
    orderedTableNames: string[],
): Promise<MutationResponse<TableDataFile>> => {
    const res = await axiosInstance.post<MutationResponse<TableDataFile>>(
        `${BASE}/reorder`,
        { ordered_table_names: orderedTableNames },
    );
    return res.data;
};

export const fetchTableRows = async (
    tableName: string,
    limit: number = 30,
): Promise<TableRowsResponse> => {
    const res = await axiosInstance.get<TableRowsResponse>(
        `${BASE}/${encodeURIComponent(tableName)}/rows`,
        { params: { limit } },
    );
    return res.data;
};

// ── Column preferences ──────────────────────────────────────────────────────

export interface ColumnPref {
    field: string;
    hidden: boolean;
    sortable: boolean;
    filterable: boolean;
    width: number | null;
}

export const fetchColumnPrefs = async (): Promise<ColumnPref[]> => {
    const res = await axiosInstance.get<ColumnPref[]>(`${BASE}/_column_prefs`);
    return res.data;
};

export const saveColumnPrefs = async (prefs: ColumnPref[]): Promise<ColumnPref[]> => {
    const res = await axiosInstance.put<ColumnPref[]>(`${BASE}/_column_prefs`, { prefs });
    return res.data;
};

export const autoDescribe = async (): Promise<{ described: number }> => {
    const res = await axiosInstance.post<{ described: number }>(`${BASE}/_auto_describe`);
    return res.data;
};

// ── Row CRUD (dev tool) ─────────────────────────────────────────────────────

export const updateTableRow = async (
    tableName: string,
    pk: Record<string, unknown>,
    data: Record<string, unknown>,
): Promise<void> => {
    await axiosInstance.patch(`${BASE}/${encodeURIComponent(tableName)}/rows`, { pk, data });
};

export const deleteTableRow = async (
    tableName: string,
    pk: Record<string, unknown>,
): Promise<void> => {
    await axiosInstance.delete(`${BASE}/${encodeURIComponent(tableName)}/rows`, { data: { pk } });
};
