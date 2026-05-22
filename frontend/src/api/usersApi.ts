// usersApi.ts

import { fetchJobByName } from "./jobsApi.ts";
import {userGroups} from "../utils/enum.ts";
import {axiosInstance} from "./axiosInstance.ts";
import type {User} from "../types/types.ts";

// Cache for job IDs to avoid repeated API calls
let jobIdCache: { [key: string]: number | null } = {};

const getJobIdByName = async (jobName: string): Promise<number | null> => {
    // Check cache first
    if (jobIdCache[jobName] !== undefined) {
        return jobIdCache[jobName];
    }
    const job = await fetchJobByName(jobName);
    const jobId = job?.id || null;

    // Cache the result
    jobIdCache[jobName] = jobId;

    return jobId;
};

export const fetchUsers = async (jobId?: number, jobName?: string): Promise<User[]> => {
    const params: any = {};
    if (jobId) {
        params.job_id = jobId.toString();
    } else if (jobName) {
        const resolvedJobId = await getJobIdByName(jobName);
        if (resolvedJobId) {
            params.job_id = resolvedJobId.toString();
        }
    }
    const response = await axiosInstance.get('/api/v1/users', { params });
    return response.data ?? [];
};

export const fetchBuyers = async (): Promise<User[]> => {
    return fetchUsers(undefined, 'buyer'); // Will dynamically resolve job ID
};

export const fetchBuyersNonProduct = async (): Promise<User[]> => {
    return fetchUsers(undefined, 'buyer_non_product'); // Will dynamically resolve job ID
};

export const fetchSellers = async (): Promise<User[]> => {
    return fetchUsers(undefined, 'seller'); // Example for other job custom_types
};

export const fetchItSupport = async (): Promise<User[]> => {
    return fetchUsers(undefined, 'it_support'); // Example for other job custom_types
};

export const fetchDevelopers = async (): Promise<User[]> => {
    return fetchUsers(undefined, 'developer'); // Example for other job custom_types
};

export const fetchControllerManagement = async (): Promise<User[]> => {
    return fetchUsers(undefined, 'controller_management'); // Example for other job custom_types
};

export const fetchAdmins = async (): Promise<User[]> => {
    return fetchUsers(undefined, userGroups.admin); // Example for other job custom_types
};
// Utility function to clear cache (useful for testing or when jobs change)
export const clearJobIdCache = (): void => {
    jobIdCache = {};
};