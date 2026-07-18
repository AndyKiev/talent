// src/routes/__root.tsx
// This file only exports `Route` (a non-component) — Fast Refresh is satisfied
// because the actual component (RootLayout) lives in its own file.
import { createRootRoute, redirect } from "@tanstack/react-router";
import { useAuthStore } from "../store/authStore";
import RootLayout from "../components/layout/Rootlayout.tsx";

const PUBLIC_PATHS = ["/auth/login"];

const isPublicPath = (path: string) =>
    PUBLIC_PATHS.some((p) => path.startsWith(p));

export const Route = createRootRoute({
    beforeLoad: ({ location }) => {
        const { access_token } = useAuthStore.getState();
        const path = location.pathname;

        if (!access_token && !isPublicPath(path)) {
            throw redirect({ to: "/auth/login" });
        }
        if (access_token && isPublicPath(path)) {
            throw redirect({ to: "/employees" });
        }
    },
    component: RootLayout,
});