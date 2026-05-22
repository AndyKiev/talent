// src/store/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
}

interface AuthState {
    access_token: string | null;
    user: AuthUser | null;
    isAuthenticated: boolean;

    setToken: (token: string) => void;
    setUser: (user: AuthUser) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            access_token: null,
            user: null,
            isAuthenticated: false,

            setToken: (token) =>
                set({ access_token: token, isAuthenticated: true }),

            setUser: (user) =>
                set({ user, isAuthenticated: true }),

            logout: () =>
                set({ access_token: null, user: null, isAuthenticated: false }),
        }),
        {
            name: "auth-storage",
            // Only persist the token — user data is refreshed from /me on mount
            partialize: (state) => ({ access_token: state.access_token }),
        }
    )
);
