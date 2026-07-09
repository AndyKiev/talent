// src/components/layout/accessTestApi.ts
// "Test as group" access-testing API. Lets a developer act as only the selected
// authorisation groups (losing bypass) to manually test access control.
import { axiosInstance } from "../../api/axiosInstance";
import { BASE_URL } from "../../utils/eNums.ts";

export interface AccessTestGroupOption {
    id: number;
    name: string;
}

export interface AccessTestState {
    active: boolean;
    group_ids: number[];
    group_names: string[];
    available_groups: AccessTestGroupOption[];
}

export const accessTestApi = {
    fetchState: async (): Promise<AccessTestState> => {
        const { data } = await axiosInstance.get<AccessTestState>(
            `${BASE_URL}/access_test/my`
        );
        return data;
    },

    setContext: async (groupIds: number[]): Promise<AccessTestState> => {
        const { data } = await axiosInstance.put<AccessTestState>(
            `${BASE_URL}/access_test/context`,
            { group_ids: groupIds }
        );
        return data;
    },

    clearContext: async (): Promise<AccessTestState> => {
        const { data } = await axiosInstance.delete<AccessTestState>(
            `${BASE_URL}/access_test/context`
        );
        return data;
    },
};
