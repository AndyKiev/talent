// src/components/layout/RootLayout.tsx
import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ThemeProvider } from "../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";

import { useLoadTranslations } from "../../hooks/useLoadTranslations";
import { authApi } from "../../api/authApi";
import { useTranslationsStore } from "../../store/useTranslationsStore.ts";
import { AUTH_ME_QK } from "../../utils/queryKeys.ts";

export default function RootLayout() {
    // Primitive selectors only — subscribing to the whole store re-renders the
    // entire routed tree (<Outlet/>) on ANY auth/translations change.
    const access_token = useAuthStore((s) => s.access_token);
    const setUser = useAuthStore((s) => s.setUser);
    const logout = useAuthStore((s) => s.logout);
    const isLoading = useTranslationsStore((s) => s.isLoading);
    const stringsLoaded = useTranslationsStore((s) => Object.keys(s.strings).length > 0);
    const { loadTranslations } = useLoadTranslations();

    // Current user. The query cache is cleared on login/logout (authStore), so
    // a stale /me from a previous identity can never land after a logout —
    // which the old raw-promise effect allowed.
    const meQuery = useQuery({
        queryKey: AUTH_ME_QK,
        queryFn: authApi.me,
        enabled: !!access_token,
        staleTime: Infinity,
        retry: false,
    });

    // Sync the fetched identity into the auth store (other components read it
    // from there); a failed /me means the token is dead — drop the session.
    useEffect(() => {
        if (meQuery.data) setUser(meQuery.data);
    }, [meQuery.data, setUser]);
    useEffect(() => {
        if (meQuery.isError) logout();
    }, [meQuery.isError, logout]);

    // Load translations once per session (loadTranslations is not memoized —
    // keep it out of the deps on purpose).
    useEffect(() => {
        if (!access_token || stringsLoaded) return;
        loadTranslations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [access_token, stringsLoaded]);

    // Show loading spinner while translations are being fetched
    if (access_token && isLoading) {
        return (
            <ThemeProvider>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100vh',
                        width: '100vw',
                        backgroundColor: 'background.default'
                    }}
                >
                    <CircularProgress />
                </Box>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider>
            <Outlet />
        </ThemeProvider>
    );
}
