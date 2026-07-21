// src/components/missions/missionApi.ts
//
// Employee development missions. Deliberately NOT built on createCrudApi: the
// list and create routes are scoped by employee (`/employee/{employeeId}`) while
// update/delete are keyed by mission id, so the factory's uniform
// BASE / BASE/{id} shape does not apply.
import { axiosInstance } from '../../api/axiosInstance';
import type { MutationResponse } from '../../types/mutationResponse';
import { BASE_URL } from '../../utils/eNums';

const MISSIONS = `${BASE_URL}/employee_missions`;
const KPIS = `${BASE_URL}/employee_mission_kpis`;
const COMMENTS = `${BASE_URL}/employee_mission_comments`;
const DIMENSION_LINKS = `${BASE_URL}/employee_mission_dimension_links`;
const VISIONS = `${BASE_URL}/employee_development_visions`;
const REVIEW_DIMENSIONS = `${BASE_URL}/review_dimensions`;

export interface MissionKpi {
    id: number;
    mission_id: number;
    text: string;
    /** Fulfilment 0-100. Only the oversight manager (or admin) may change it. */
    percent: number;
    sort_order: number;
    created_at: string;
}

export interface MissionComment {
    id: number;
    mission_id: number;
    author_employee_id: number;
    text: string;
    created_at: string;
    author_name: string | null;
}

export interface Mission {
    id: number;
    employee_id: number;
    text: string;
    /** ISO 'YYYY-MM-DD'. Displayed as DD.MM.YYYY everywhere. */
    start_date: string;
    duration_months: number;
    /** Derived server-side from start_date + duration_months; never sent by us. */
    end_date: string;
    created_at: string;
    kpis: MissionKpi[];
    comments: MissionComment[];
    dimension_id: number | null;
    dimension_name: string | null;
    dimension_color: string | null;
    /** Derived server-side so the UI and the `mission_max_active` cap can
     *  never disagree about what counts as active. */
    is_expired: boolean;
    is_accomplished: boolean;
    is_active: boolean;
}

export interface MissionCreate {
    text: string;
    start_date: string;
    duration_months: number;
    kpis: { text: string }[];
    dimension_id?: number | null;
}

export interface MissionUpdate {
    text?: string;
    start_date?: string;
    duration_months?: number;
}

export interface MissionHistoryEntry {
    id: number;
    entity_kind: string;
    entity_id: number | null;
    action: string;
    changes: Record<string, { old: string | number | null; new: string | number | null }> | null;
    actor_name: string | null;
    changed_at: string;
}

export interface DevelopmentVision {
    id: number;
    employee_id: number;
    text: string;
    created_at: string;
    updated_at: string;
}

/** A competence option, sourced from GET /review_dimensions (auth-only route). */
export interface MissionDimensionOption {
    id: number;
    name: string;
    color: string;
}

interface ReviewDimensionRow {
    id: number;
    name: string;
    color: string | null;
    sort_order: number | null;
    is_active: boolean;
}

/** Fallback matching the backend column default, so a dimension with no colour
 *  still renders as a chip rather than an invisible one. */
const DEFAULT_DIMENSION_COLOR = '#1565C0';

// ── missions ────────────────────────────────────────────────────────────────

export async function fetchMissions(employeeId: number): Promise<Mission[]> {
    const res = await axiosInstance.get<Mission[]>(`${MISSIONS}/employee/${employeeId}`);
    return res.data ?? [];
}

export async function createMission(
    employeeId: number,
    body: MissionCreate,
): Promise<MutationResponse<Mission>> {
    const res = await axiosInstance.post<MutationResponse<Mission>>(
        `${MISSIONS}/employee/${employeeId}`,
        body,
    );
    return res.data;
}

export async function updateMission(
    missionId: number,
    body: MissionUpdate,
): Promise<MutationResponse<Mission>> {
    const res = await axiosInstance.patch<MutationResponse<Mission>>(
        `${MISSIONS}/${missionId}`,
        body,
    );
    return res.data;
}

export async function deleteMission(missionId: number): Promise<{ detail: string }> {
    const res = await axiosInstance.delete<{ detail: string }>(`${MISSIONS}/${missionId}`);
    return res.data;
}

export async function fetchMissionHistory(missionId: number): Promise<MissionHistoryEntry[]> {
    const res = await axiosInstance.get<MissionHistoryEntry[]>(`${MISSIONS}/${missionId}/history`);
    return res.data ?? [];
}

/**
 * Every mission/KPI change for one employee, INCLUDING missions that have been
 * deleted. A deleted mission has no row left to click, so its per-mission
 * history is unreachable — this is where it remains auditable.
 */
export async function fetchEmployeeMissionHistory(
    employeeId: number,
): Promise<MissionHistoryEntry[]> {
    const res = await axiosInstance.get<MissionHistoryEntry[]>(
        `${MISSIONS}/employee/${employeeId}/history`,
    );
    return res.data ?? [];
}

// ── KPIs ────────────────────────────────────────────────────────────────────

export async function createKpi(
    missionId: number,
    body: { text: string },
): Promise<MutationResponse<MissionKpi>> {
    const res = await axiosInstance.post<MutationResponse<MissionKpi>>(
        `${KPIS}/mission/${missionId}`,
        body,
    );
    return res.data;
}

export async function updateKpi(
    kpiId: number,
    body: { text?: string; percent?: number },
): Promise<MutationResponse<MissionKpi>> {
    const res = await axiosInstance.patch<MutationResponse<MissionKpi>>(`${KPIS}/${kpiId}`, body);
    return res.data;
}

export async function deleteKpi(kpiId: number): Promise<{ detail: string }> {
    const res = await axiosInstance.delete<{ detail: string }>(`${KPIS}/${kpiId}`);
    return res.data;
}

// ── comments ────────────────────────────────────────────────────────────────

export async function fetchMissionComments(missionId: number): Promise<MissionComment[]> {
    const res = await axiosInstance.get<MissionComment[]>(`${COMMENTS}/mission/${missionId}`);
    return res.data ?? [];
}

export async function createMissionComment(
    missionId: number,
    body: { text: string },
): Promise<MutationResponse<MissionComment>> {
    const res = await axiosInstance.post<MutationResponse<MissionComment>>(
        `${COMMENTS}/mission/${missionId}`,
        body,
    );
    return res.data;
}

export async function updateMissionComment(
    commentId: number,
    body: { text: string },
): Promise<MutationResponse<MissionComment>> {
    const res = await axiosInstance.patch<MutationResponse<MissionComment>>(
        `${COMMENTS}/${commentId}`,
        body,
    );
    return res.data;
}

export async function deleteMissionComment(commentId: number): Promise<{ detail: string }> {
    const res = await axiosInstance.delete<{ detail: string }>(`${COMMENTS}/${commentId}`);
    return res.data;
}

// ── competence link ─────────────────────────────────────────────────────────

export async function setMissionDimension(
    missionId: number,
    dimensionId: number,
): Promise<MutationResponse<unknown>> {
    const res = await axiosInstance.put<MutationResponse<unknown>>(
        `${DIMENSION_LINKS}/mission/${missionId}`,
        { dimension_id: dimensionId },
    );
    return res.data;
}

export async function clearMissionDimension(missionId: number): Promise<{ detail: string }> {
    const res = await axiosInstance.delete<{ detail: string }>(
        `${DIMENSION_LINKS}/mission/${missionId}`,
    );
    return res.data;
}

// ── development vision ──────────────────────────────────────────────────────

export async function fetchDevelopmentVision(
    employeeId: number,
): Promise<DevelopmentVision | null> {
    const res = await axiosInstance.get<DevelopmentVision | null>(
        `${VISIONS}/employee/${employeeId}`,
    );
    return res.data ?? null;
}

export async function saveDevelopmentVision(
    employeeId: number,
    text: string,
): Promise<MutationResponse<DevelopmentVision>> {
    const res = await axiosInstance.put<MutationResponse<DevelopmentVision>>(
        `${VISIONS}/employee/${employeeId}`,
        { text },
    );
    return res.data;
}

// ── competence options ──────────────────────────────────────────────────────

/**
 * Competence options for the mission form, BY ID.
 *
 * Both hosts (the employee card tab and the people-review analysis tab) use this
 * one query rather than the dimension_key/_name/_color denormalized onto each
 * review Evaluation — those carry no id, and the link table references
 * review_dimensions.id. The old lowercase-key matching disappeared with the JSON
 * column. GET /review_dimensions is auth-only, so it works outside a review too.
 */
export async function fetchMissionDimensionOptions(): Promise<MissionDimensionOption[]> {
    const res = await axiosInstance.get<ReviewDimensionRow[]>(REVIEW_DIMENSIONS);
    return (res.data ?? [])
        .filter((d) => d.is_active)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((d) => ({
            id: d.id,
            name: d.name,
            color: d.color || DEFAULT_DIMENSION_COLOR,
        }));
}
