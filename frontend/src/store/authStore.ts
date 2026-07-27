// src/store/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { queryClient } from "../api/queryClient";

export interface AuthUser {
    id: number;
    code: string;
    name: string;
    email: string | null;
    is_active: boolean;
    job_id: number | null;
    lang_id: number | null;
    job: { id: number; name: string; description: string } | null;
    lang: { id: number; name: string; short_name: string } | null;
    groups: string[];
    operations: string[];
    // Access-testing ("test as group"): can_access_test = real developer/bypass
    // user (may enter the mode); access_testing = currently impersonating groups.
    can_access_test?: boolean;
    access_testing?: boolean;
}

interface AuthState {
    access_token: string | null;
    refresh_token: string | null;
    user: AuthUser | null;
    isAuthenticated: boolean;

    setTokens: (accessToken: string, refreshToken: string) => void;
    rotateTokens: (accessToken: string, refreshToken: string) => void;
    setAccessToken: (accessToken: string) => void;
    setUser: (user: AuthUser) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            access_token: null,
            refresh_token: null,
            user: null,
            isAuthenticated: false,

            // LOGIN ONLY: store both the short-lived access token and the
            // long-lived refresh token. The query cache holds USER-SCOPED data,
            // so a fresh login (possibly a different person) must start from an
            // empty cache — otherwise the previous user's data keeps rendering
            // under the new user's URLs. For a silent refresh of the SAME
            // identity use rotateTokens (no clear).
            setTokens: (accessToken, refreshToken) => {
                queryClient.clear();
                set({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    isAuthenticated: true,
                });
            },

            // Silent refresh WITH rotation: same identity, new token pair.
            // MUST NOT clear the query cache — setTokens' clear() is a
            // login-only concern. Clearing here removes every query while its
            // fetch is still in flight; the orphaned observers stay pending
            // forever and the page hangs on its spinner (see the axios
            // interceptor's refresh path).
            rotateTokens: (accessToken, refreshToken) =>
                set({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    isAuthenticated: true,
                }),

            // Silent refresh: replace only the access token (refresh token stays).
            setAccessToken: (accessToken) =>
                set({ access_token: accessToken, isAuthenticated: true }),

            setUser: (user) =>
                set({ user, isAuthenticated: true }),

            // Logout: drop the identity AND every cached query — covers the
            // AppShell sign-out, the /me failure path, and the axios 401
            // interceptor alike.
            logout: () => {
                queryClient.clear();
                set({
                    access_token: null,
                    refresh_token: null,
                    user: null,
                    isAuthenticated: false,
                });
            },
        }),
        {
            name: "auth-storage",
            // Persist both tokens — user data is refreshed from /me on mount.
            partialize: (state) => ({
                access_token: state.access_token,
                refresh_token: state.refresh_token,
            }),
        }
    )
);
