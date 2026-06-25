// src/components/admin/talent_status_period_links/talentStatusPeriodLinkApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';
import type { TalentPeriod } from '../talent_periods/talentPeriodApi';

const BASE = `${BASE_URL}/talent_status_period_links`;

// ── Embedded sub-types ────────────────────────────────────────────────────────

export interface TalentStatusEmbedded {
    id: number;
    key: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

// ── Main resource type ────────────────────────────────────────────────────────

export interface TalentStatusPeriodLink {
    id: number;
    talent_period_id: number;
    talent_status_id: number;
    is_active: boolean;
    created_by: number | null;
    created_at: string;
    talent_period: TalentPeriod | null;
    talent_status: TalentStatusEmbedded | null;
}

/**
 * Returned by GET /active-pairs — identical to TalentStatusPeriodLink but
 * includes the backend-computed label, e.g. "PO - 24" or "PA - 36".
 */
export interface TalentStatusPeriodLinkWithLabel extends TalentStatusPeriodLink {
    label: string;
}

export interface TalentStatusPeriodLinkCreate {
    talent_period_id: number;
    talent_status_id: number;
    is_active: boolean;
}

export interface TalentStatusPeriodLinkUpdate {
    is_active?: boolean;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const fetchTalentStatusPeriodLinks = async (): Promise<TalentStatusPeriodLink[]> => {
    const res = await axiosInstance.get<TalentStatusPeriodLink[]>(BASE);
    return res.data ?? [];
};

/**
 * GET /talent_status_period_links/active-pairs
 *
 * is_active=true  → only rows where link + status + period are ALL active
 * is_active=false → all rows, no filtering at any level
 * omitted         → same as false
 */
export const fetchActivePairs = async (
    is_active?: boolean,
): Promise<TalentStatusPeriodLinkWithLabel[]> => {
    const params = is_active !== undefined ? { is_active } : {};
    const res = await axiosInstance.get<TalentStatusPeriodLinkWithLabel[]>(
        `${BASE}/active-pairs`,
        { params },
    );
    return res.data ?? [];
};

export const createTalentStatusPeriodLink = async (
    body: TalentStatusPeriodLinkCreate,
): Promise<MutationResponse<TalentStatusPeriodLink>> => {
    const res = await axiosInstance.post<MutationResponse<TalentStatusPeriodLink>>(BASE, body);
    return res.data;
};

export const updateTalentStatusPeriodLink = async ({
                                                       id,
                                                       data,
                                                   }: {
    id: number;
    data: TalentStatusPeriodLinkUpdate;
}): Promise<MutationResponse<TalentStatusPeriodLink>> => {
    const res = await axiosInstance.patch<MutationResponse<TalentStatusPeriodLink>>(
        `${BASE}/${id}`,
        data,
    );
    return res.data;
};

export const deleteTalentStatusPeriodLink = async (
    id: number,
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};