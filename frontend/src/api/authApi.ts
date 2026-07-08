// src/api/authApi.ts
import { axiosInstance, axiosFormDataInstance } from "./axiosInstance";
import type { AuthUser } from "../store/authStore";
import {BASE_URL} from "../utils/eNums.ts";

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface RegisterConfig {
    enabled: boolean;
    domains: string[];
}

export interface LangOption {
    id: number;
    name: string;
    short_name: string;
}

export interface MyLangUpdateResponse {
    detail: string;
    user: AuthUser;
}

export const authApi = {
    // Public: whether the login page should offer self-registration + the
    // allowed email domains. Called pre-auth (no token needed).
    registerConfig: async (): Promise<RegisterConfig> => {
        const { data } = await axiosInstance.get<RegisterConfig>(
            `${BASE_URL}/jwt/register_config`
        );
        return data;
    },

    // Public: create a pending employee record (code + name + email).
    register: async (code: string, name: string, email: string): Promise<void> => {
        await axiosInstance.post(`${BASE_URL}/jwt/register`, { code, name, email });
    },

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

    // Available app languages (for the user-menu language switch).
    langs: async (): Promise<LangOption[]> => {
        const { data } = await axiosInstance.get<LangOption[]>(`${BASE_URL}/langs`);
        return data ?? [];
    },

    // Self-service: persist the user's app language (employees.lang_id) and
    // get back the refreshed /me payload + a success detail in the NEW language.
    updateMyLang: async (langId: number): Promise<MyLangUpdateResponse> => {
        const { data } = await axiosInstance.patch<MyLangUpdateResponse>(
            `${BASE_URL}/jwt/users/me/lang`,
            { lang_id: langId }
        );
        return data;
    },
};
