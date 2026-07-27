// src/api/axiosInstance.ts
import axios from "axios";
import type {
    AxiosInstance,
    InternalAxiosRequestConfig,
    AxiosResponse,
    AxiosError,
} from "axios";
import { BASE_URL } from "../utils/eNums";
import { useAuthStore } from "../store/authStore";

// Auth state is read/written through the store's non-reactive getState() API so
// the in-memory state and its persisted (localStorage) copy never diverge after
// a silent refresh — otherwise a later set() (e.g. setUser on mount) would
// re-persist a stale access token and clobber the freshly refreshed one.
// NOTE: authStore must NOT import from api/, or this becomes a circular import.
const getAuthToken = (): string | null => useAuthStore.getState().access_token;
const getRefreshToken = (): string | null =>
    useAuthStore.getState().refresh_token;

const clearAuthAndRedirect = (): void => {
    useAuthStore.getState().logout();
    if (window.location.pathname !== "/auth/login") {
        window.location.href = "/auth/login";
    }
};

// A bare client (no interceptors) used ONLY to hit the refresh endpoint, so the
// refresh request itself can never re-enter the refresh interceptor.
const refreshClient = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_API_URL,
    headers: { "Content-Type": "application/json;charset=utf-8" },
    timeout: 30_000,
});

// ── Single-flight refresh ─────────────────────────────────────────────────────
// While one refresh is in flight, every other 401'd request waits on the same
// promise and is replayed once the new access token arrives (or all fail if the
// refresh fails).
let isRefreshing = false;
let pendingQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
}> = [];

const flushQueue = (error: unknown, token: string | null): void => {
    pendingQueue.forEach((p) => {
        if (token) p.resolve(token);
        else p.reject(error);
    });
    pendingQueue = [];
};

const refreshAccessToken = async (): Promise<string> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token");
    const { data } = await refreshClient.post<{
        access_token: string;
        refresh_token?: string;
    }>(`${BASE_URL}/jwt/refresh`, { refresh_token: refreshToken });
    // The backend rotates the refresh token on every refresh (sliding
    // session) — persist the new one so the next refresh uses it.
    // rotateTokens, NOT setTokens: the identity is unchanged, so the query
    // cache must survive. setTokens clears it, which would kill the very
    // requests waiting on this refresh.
    if (data.refresh_token) {
        useAuthStore
            .getState()
            .rotateTokens(data.access_token, data.refresh_token);
    } else {
        useAuthStore.getState().setAccessToken(data.access_token);
    }
    return data.access_token;
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

    // ── Response: silent refresh on 401, else surface the error ───────────────
    instance.interceptors.response.use(
        (response: AxiosResponse) => response,
        async (error: AxiosError) => {
            const originalRequest = error.config as
                | (InternalAxiosRequestConfig & { _retry?: boolean })
                | undefined;
            const status = error.response?.status;
            const url = originalRequest?.url ?? "";
            // A failed login/refresh must never itself trigger a refresh.
            const isAuthCall =
                url.includes("/jwt/login") || url.includes("/jwt/refresh");

            if (status === 401 && originalRequest && !isAuthCall) {
                // Already refreshed-and-retried once and STILL 401 → the new
                // token was rejected too; stop looping and log out.
                if (originalRequest._retry) {
                    clearAuthAndRedirect();
                    return Promise.reject(error);
                }
                // No refresh token to spend → straight to login.
                if (!getRefreshToken()) {
                    clearAuthAndRedirect();
                    return Promise.reject(error);
                }

                originalRequest._retry = true;

                // A refresh is already running — wait for it, then replay.
                if (isRefreshing) {
                    return new Promise<string>((resolve, reject) => {
                        pendingQueue.push({ resolve, reject });
                    }).then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return instance(originalRequest);
                    });
                }

                isRefreshing = true;
                try {
                    const newToken = await refreshAccessToken();
                    flushQueue(null, newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return instance(originalRequest);
                } catch (refreshError) {
                    flushQueue(refreshError, null);
                    clearAuthAndRedirect();
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
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
