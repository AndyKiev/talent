// src/components/admin/talent-periods/talentPeriodApi.ts
import { BASE_URL } from "../../../utils/eNums.ts"
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

const BASE = `${BASE_URL}/admin/talent_periods`;

export interface TalentPeriod {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    qty_months: number;  // Added
    created_at: string;
}

export interface TalentPeriodCreate {
    name: string;
    description?: string | null;
    is_active: boolean;
    qty_months: number;  // Added
}

export interface TalentPeriodUpdate {
    name?: string;
    description?: string | null;
    is_active?: boolean;
    qty_months?: number;  // Added
}

const crud = createCrudApi<TalentPeriod, TalentPeriodCreate, TalentPeriodUpdate>(BASE);

export const fetchTalentPeriods = crud.fetchList;

export const createTalentPeriod = crud.create;

export const updateTalentPeriod = crud.update;

export const deleteTalentPeriod = crud.remove;