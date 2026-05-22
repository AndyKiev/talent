// src/api/authApi.ts
import { axiosInstance, axiosFormDataInstance } from "./axiosInstance";
import type { AuthUser } from "../store/authStore";
import {BASE_URL} from "../utils/eNums.ts";

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

export const authApi = {
    login: async (username: string, password: string): Promise<LoginResponse> => {
        const form = new FormData();
        form.append("username", username);
        form.append("password", password);
        const { data } = await axiosFormDataInstance.post<LoginResponse>(
            `${BASE_URL}/jwt/login`,
            form
        );
        return data;
    },

    me: async (): Promise<AuthUser> => {
        const { data } = await axiosInstance.get<AuthUser>(`${BASE_URL}/jwt/users/me`);

        return data;
    },
};
