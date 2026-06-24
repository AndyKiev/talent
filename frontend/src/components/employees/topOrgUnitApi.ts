// src/components/employees/topOrgUnitApi.ts
//
// Resolves a batch of department ids to their top-level org unit
// (board / directorate / store) via the backend, which walks up the tree
// using category keys. Used by the Job History tab to show main + subordinate.

import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';
import type { TopOrgUnit } from './employeeApi';

export interface DepartmentTopResolution {
    department_id: number;
    top: TopOrgUnit | null;
}

export const fetchTopOrgUnits = async (
    ids: number[],
): Promise<DepartmentTopResolution[]> => {
    if (ids.length === 0) return [];
    const res = await axiosInstance.get<DepartmentTopResolution[]>(
        `${BASE_URL}/departments/top_org_units`,
        { params: { ids: ids.join(',') } },
    );
    return res.data ?? [];
};
