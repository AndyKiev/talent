import { axiosInstance } from './axiosInstance';
import { BASE_URL } from '../utils/eNums.ts';
import type { MutationResponse } from '../types/mutationResponse';

const EMP_BASE = `${BASE_URL}/employees`;

// Mirror of the backend MutationResponse wrapper ({ detail, data }).

export interface EmployeePhotoMeta {
    employee_id: number;
    content_type: string;
    size: number;
}

// Client-side guards (the backend re-validates and downscales authoritatively).
export const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png'];
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PHOTO_MAX_LABEL = '8MB';

/** Fetch the stored photo as a Blob, or null when the employee has none
 *  (204 No Content; 404 kept for backward compatibility). */
export const fetchEmployeePhotoBlob = async (employeeId: number): Promise<Blob | null> => {
    try {
        const res = await axiosInstance.get<Blob>(`${EMP_BASE}/${employeeId}/photo`, {
            responseType: 'blob',
        });
        if (res.status === 204 || !res.data || res.data.size === 0) return null;
        return res.data;
    } catch (err) {
        if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
        throw err;
    }
};

export const uploadEmployeePhoto = async (
    employeeId: number,
    file: File,
): Promise<MutationResponse<EmployeePhotoMeta>> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await axiosInstance.put<MutationResponse<EmployeePhotoMeta>>(
        `${EMP_BASE}/${employeeId}/photo`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
};

export const deleteEmployeePhoto = async (
    employeeId: number,
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(
        `${EMP_BASE}/${employeeId}/photo`,
    );
    return res.data;
};
