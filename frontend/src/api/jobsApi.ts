// jobsApi.ts
import { axiosInstance } from "../../../../talent/frontend/src/api/axiosInstance.ts";

export interface Job {
    id: number;
    name: string;
    description: string;
    created_at: string;
}

export const fetchJobByName = async (jobName: string): Promise<Job | null> => {
    try {
        const response = await axiosInstance.get('/api/v1/jobs', {
            params: { name: jobName }
        });

        // The response is an array, so we need to get the first element
        const jobs = response.data;

        if (Array.isArray(jobs) && jobs.length > 0) {
            return jobs[0]; // Return the first job in the array
        }

        return null; // No job found
    } catch (error) {
        console.error(`Error fetching job by name "${jobName}":`, error);
        return null;
    }
};

export const fetchJobs = async (): Promise<Job[]> => {
    try {
        const response = await axiosInstance.get('/api/v1/jobs');
        return response.data ?? [];
    } catch (error) {
        console.error('Error fetching jobs:', error);
        return [];
    }
};