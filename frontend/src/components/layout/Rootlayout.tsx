// src/components/layout/RootLayout.tsx
import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { ThemeProvider } from "../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";

import { useLoadTranslations } from "../../hooks/useLoadTranslations";
import { authApi } from "../../api/authApi";
import {useTranslationsStore} from "../../store/useTranslationsStore.ts";

export default function RootLayout() {
    const { access_token, setUser, logout } = useAuthStore();
    const { isLoading, strings } = useTranslationsStore();
    const { loadTranslations } = useLoadTranslations();

    useEffect(() => {
        if (!access_token) return;

        // Fetch user data
        authApi
            .me()
            .then((user) => setUser(user))
            .catch(() => logout());

        // Load translations only if not already loaded
        if (Object.keys(strings).length === 0) {
            loadTranslations();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [access_token]);

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