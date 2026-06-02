// src/components/layout/AppShell.tsx
import { type FC, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
    AppBar,
    Box,
    Toolbar,
    Typography,
    Button,
    Stack,
    Chip,
    Tooltip,
    IconButton,
} from "@mui/material";
import CodeIcon from '@mui/icons-material/Code';
import { LogoutRounded, PeopleAltRounded, AdminPanelSettingsRounded, RateReviewRounded, InsightsRounded } from "@mui/icons-material";
import { useTheme } from "../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import ThemeSwitch from "../theme/ThemeSwitch";
import { NotificationBell } from "../notifications/NotificationBell";
import cfl from "../../utils/capitalizeFirstLetter.ts";
import useString from "../../hooks/useString.ts";
import str from "../../strings/str.ts";

// const ADMIN_GROUP = "admin"; // adjust to match your LDAP group name

interface AppShellProps {
    children: ReactNode;
}

const AppShell: FC<AppShellProps> = ({ children }) => {
    const { t, mode } = useTheme();
    const getString = useString({ str });
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const routerState = useRouterState();
    const currentPath = routerState.location.pathname;

    // const isAdmin = user?.groups?.some(
    //     (g) => g.toLowerCase() === ADMIN_GROUP
    // ) ?? false;

    const handleLogout = async () => {
        logout();
        await navigate({ to: "/auth/login" });
    };

    const navBtn = (
        label: string,
        path: string,
        icon: ReactNode
    ) => {
        const active = currentPath.startsWith(path);
        return (
            <Button
                key={path}
                startIcon={icon}
                onClick={() => navigate({ to: path as "/" })}
                sx={{
                    borderRadius: "9px",
                    px: 1.75,
                    py: 0.75,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? t.accent : t.textMuted,
                    background: active ? `${t.accent}14` : "transparent",
                    textTransform: "none",
                    letterSpacing: 0,
                    "&:hover": {
                        background: `${t.accent}10`,
                        color: t.accent,
                    },
                    transition: "all 0.15s",
                }}
            >
                {cfl(getString(label))}
            </Button>
        );
    };

    return (
        <Box sx={{ minHeight: "100vh", background: t.bg, transition: "background 0.3s" }}>
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    background: mode === "dark"
                        ? `${t.cardBg}ee`
                        : `${t.cardBg}f0`,
                    backdropFilter: "blur(12px)",
                    borderBottom: `1px solid ${t.borderLight}`,
                    color: t.text,
                }}
            >
                <Toolbar sx={{ gap: 1, minHeight: "56px !important", px: { xs: 2, sm: 3 } }}>
                    {/* Brand */}
                    <Stack direction="row" alignItems="center" spacing={1} mr={3}>
                        <Box
                            sx={{
                                width: 28,
                                height: 28,
                                borderRadius: "8px",
                                background: `linear-gradient(135deg, ${t.accent}, #2d5eed)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 14,
                                flexShrink: 0,
                            }}
                        >
                            ⚡
                        </Box>
                        <Typography
                            fontWeight={700}
                            fontSize={15}
                            letterSpacing="-0.02em"
                            color={t.text}
                            sx={{ userSelect: "none" }}
                        >
                            Talent
                        </Typography>
                    </Stack>

                    {/* Nav items */}
                    <Stack direction="row" spacing={0.5} flexGrow={1}>
                        {navBtn("employees", "/employees", <PeopleAltRounded sx={{ fontSize: 16 }} />)}
                        {navBtn("planning", "/planning", <InsightsRounded sx={{ fontSize: 16 }} />)}
                        {navBtn("peopleReview", "/people-review", <RateReviewRounded sx={{ fontSize: 16 }} />)}
                        {navBtn("admin", "/admin", <AdminPanelSettingsRounded sx={{ fontSize: 16 }} />)}
                        {navBtn("developer", "/developer", <CodeIcon sx={{ fontSize: 16 }} />)}
                        {/*{isAdmin && navBtn("Admin", "/admin", <AdminPanelSettingsRounded sx={{ fontSize: 16 }} />)}*/}
                    </Stack>

                    {/* Right side */}
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <ThemeSwitch />

                        {user && (
                            <Chip
                                // label={user.name.split(" ")[0]}
                                label={user.name}
                                size="small"
                                sx={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    height: 28,
                                    background: `${t.accent}14`,
                                    color: t.accent,
                                    border: "none",
                                    display: { xs: "none", sm: "flex" },
                                }}
                            />
                        )}

                        <NotificationBell />

                        <Tooltip title="Sign out">
                            <IconButton
                                size="small"
                                onClick={handleLogout}
                                sx={{
                                    color: t.textMuted,
                                    "&:hover": { color: t.text, background: `${t.text}10` },
                                    borderRadius: "8px",
                                }}
                            >
                                <LogoutRounded fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Toolbar>
            </AppBar>

            {/* Page content */}
            {children}
        </Box>
    );
};

export default AppShell;
