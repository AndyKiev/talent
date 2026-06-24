// src/components/planning/planMatrixApi.ts
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';

const MATRICES = `${BASE_URL}/admin/plan_matrices`;

// ── Types (mirror backend plan_matrix_schema.py) ───────────────────────────

export type TargetMode = 'total' | 'by_status';

export interface JobDef {
    id: string;
    key: string;
    name: string;
}

export interface JobGroupConfig {
    target_mode: TargetMode;
    fact_mode: TargetMode;
    jobs: JobDef[];
}

export interface JobGroupDef {
    id: string;
    key: string;
    name: string;
    config: JobGroupConfig;
}

export interface TalentStatus {
    id: string;
    key: string;
    name: string;
}

export interface Department {
    id: string;
    key: string;
    name: string;
    region_id?: string | null;
    region_key?: string | null;
    region_name?: string | null;
}

export interface MatrixRegion {
    id: string;
    key: string;
    name: string;
    sort_order: number;
}

export interface Essences {
    talent_statuses: TalentStatus[];
    job_groups: JobGroupDef[];
    departments: Department[];
    regions: MatrixRegion[];
}

export type StatusFact = { pa: number | null; po: number | null };
export type JobStatusFact = Record<string, StatusFact>;
export type FactValue = StatusFact | JobStatusFact | number;
export type TargetValue = number | StatusFact;

export interface JobGroupRowData {
    target: TargetValue;
    fact: FactValue;
    pct: number | null;
}

export interface SummaryData {
    base_target: number | null;
    object_target: number | null;
    fact: number | null;
    pct: number | null;
}

export interface MatrixRow {
    department_id?: string;
    department_key?: string;
    org_unit_key?: string;
    region_id?: string | null;
    region_key?: string | null;
    region_name?: string | null;
    label?: string;
    job_groups: Record<string, JobGroupRowData>;
    summary: SummaryData;
}

export interface MatrixMeta {
    version: string;
    plan_session_id: number;
    description: string;
}

export interface Matrix {
    matrix_meta: MatrixMeta;
    essences: Essences;
    grand_totals: MatrixRow;
    data: MatrixRow[];
}

// ── Fetch ────────────────────────────────────────────────────────────────────

export const fetchPlanMatrixBySession = async (
    planSessionId: number,
): Promise<Matrix> => {
    const res = await axiosInstance.get<Matrix>(
        `${MATRICES}/by_session/${planSessionId}`,
    );
    return res.data;
};
