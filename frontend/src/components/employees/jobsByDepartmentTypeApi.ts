// src/components/employees/jobsByDepartmentTypeApi.ts
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';

export interface JobWithLinkId {
    id: number;
    name: string;
    link_id: number;
    link_is_active: boolean;
}

export const fetchJobsByDepartmentType = async (
    departmentTypeId: number,
): Promise<JobWithLinkId[]> => {
    const res = await axiosInstance.get<JobWithLinkId[]>(
        `${BASE_URL}/department_type_job_links/by_department_type/${departmentTypeId}/jobs`,
        { params: { is_active: true } },
    );
    return res.data ?? [];
};
