// src/api/axiosInstance.ts
import axios from "axios";
import type {
    AxiosInstance,
    InternalAxiosRequestConfig,
    AxiosResponse,
    AxiosError,
} from "axios";

// Read token directly from localStorage to avoid importing the store
// (which would cause circular deps if the store ever imports from api/)
const getAuthToken = (): string | null => {
    try {
        const raw = localStorage.getItem("auth-storage");
        if (raw) {
            const parsed = JSON.parse(raw);
            return parsed?.state?.access_token ?? null;
        }
    } catch {
        // ignore
    }
    return null;
};

const createBaseAxiosInstance = (contentType?: string): AxiosInstance => {
    const baseUrl = import.meta.env.VITE_BACKEND_API_URL;

    const instance: AxiosInstance = axios.create({
        baseURL: baseUrl,
        headers: {
            "Content-Type": contentType ?? "application/json;charset=utf-8",
        },
        withCredentials: false,
        timeout: 30_000,
    });

    // ── Request: attach Bearer token ──────────────────────────────────────────
    instance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            const token = getAuthToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error: AxiosError) => Promise.reject(error)
    );

    // ── Response: handle errors centrally ────────────────────────────────────
    instance.interceptors.response.use(
        (response: AxiosResponse) => response,
        (error: AxiosError) => {
            if (error.response?.status === 401) {
                // Clear persisted auth and redirect to login
                localStorage.removeItem("auth-storage");
                window.location.href = "/auth/login";
            }

            // Surface the backend detail message if present
            const detail = (error.response?.data as { detail?: string })?.detail;
            if (detail) {
                return Promise.reject(new Error(detail));
            }
            return Promise.reject(error);
        }
    );

    return instance;
};

export const axiosInstance = createBaseAxiosInstance();
export const axiosFormDataInstance = createBaseAxiosInstance("multipart/form-data");
