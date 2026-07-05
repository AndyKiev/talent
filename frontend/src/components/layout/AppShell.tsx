// src/components/layout/AppShell.tsx
import { type FC, type ReactNode, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
    Menu,
    MenuItem as MuiMenuItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import CodeIcon from '@mui/icons-material/Code';
import InsightsRounded from '@mui/icons-material/InsightsRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import MenuRounded from '@mui/icons-material/MenuRounded';
import { LogoutRounded, PeopleAltRounded, AdminPanelSettingsRounded, RateReviewRounded, SchoolRounded } from "@mui/icons-material";
import { useTheme } from "../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import ThemeSwitch from "../theme/ThemeSwitch";
import cfl from "../../utils/helpers.ts";
import useString from "../../hooks/useString.ts";
import str from "../../strings/str.ts";
import { fetchMyMenus, type MenuItem } from "./menuApi";
import { MENUS_MY_QK } from "../../utils/queryKeys";

// menus.icon (string in the DB) → MUI icon component. Unknown/missing icons
// fall back to a generic menu glyph.
const MENU_ICONS: Record<string, ReactNode> = {
    people: <PeopleAltRounded sx={{ fontSize: 16 }} />,
    insights: <InsightsRounded sx={{ fontSize: 16 }} />,
    review: <RateReviewRounded sx={{ fontSize: 16 }} />,
    school: <SchoolRounded sx={{ fontSize: 16 }} />,
    adminPanel: <AdminPanelSettingsRounded sx={{ fontSize: 16 }} />,
    code: <CodeIcon sx={{ fontSize: 16 }} />,
};

const menuIcon = (icon: string | null): ReactNode =>
    (icon && MENU_ICONS[icon]) || <MenuRounded sx={{ fontSize: 16 }} />;

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

    // Dynamic navigation from the menus table (filtered per-user server-side).
    const { data: menus = [] } = useQuery({
        queryKey: MENUS_MY_QK,
        queryFn: fetchMyMenus,
        enabled: !!user,
        staleTime: 5 * 60_000,
    });
    const topMenus = menus.filter((m) => m.parent_id === null);
    const childrenOf = (parentId: number) =>
        menus.filter((m) => m.parent_id === parentId);

    // Open dropdown state for items that have children.
    const [submenuAnchor, setSubmenuAnchor] = useState<{
        parentId: number;
        anchor: HTMLElement;
    } | null>(null);

    const handleLogout = async () => {
        logout();
        await navigate({ to: "/auth/login" });
    };

    const navBtn = (item: MenuItem) => {
        const kids = childrenOf(item.id);
        const active =
            currentPath.startsWith(item.path) ||
            kids.some((k) => currentPath.startsWith(k.path));
        return (
            <Button
                key={item.id}
                startIcon={menuIcon(item.icon)}
                endIcon={kids.length > 0 ? <ExpandMoreRounded sx={{ fontSize: 16 }} /> : undefined}
                onClick={(e) =>
                    kids.length > 0
                        ? setSubmenuAnchor({ parentId: item.id, anchor: e.currentTarget })
                        : navigate({ to: item.path as "/" })
                }
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
                {cfl(getString(item.label_key))}
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

                    {/* Nav items — dynamic, from the menus table */}
                    <Stack direction="row" spacing={0.5} flexGrow={1}>
                        {topMenus.map((item) => navBtn(item))}
                        {/* Sub-menu dropdown for the item that opened it */}
                        <Menu
                            open={submenuAnchor != null}
                            anchorEl={submenuAnchor?.anchor ?? null}
                            onClose={() => setSubmenuAnchor(null)}
                        >
                            {(submenuAnchor ? childrenOf(submenuAnchor.parentId) : []).map((child) => (
                                <MuiMenuItem
                                    key={child.id}
                                    selected={currentPath.startsWith(child.path)}
                                    onClick={() => {
                                        setSubmenuAnchor(null);
                                        navigate({ to: child.path as "/" });
                                    }}
                                >
                                    <ListItemIcon>{menuIcon(child.icon)}</ListItemIcon>
                                    <ListItemText>{cfl(getString(child.label_key))}</ListItemText>
                                </MuiMenuItem>
                            ))}
                        </Menu>
                        {/* Personal settings — available to ALL users (ungated). */}
                        <Tooltip title={cfl(getString("mySettings"))}>
                            <IconButton
                                size="small"
                                onClick={() => navigate({ to: "/settings" as "/" })}
                                sx={{
                                    color: currentPath.startsWith("/settings") ? t.accent : t.textMuted,
                                    background: currentPath.startsWith("/settings") ? `${t.accent}14` : "transparent",
                                    "&:hover": { color: t.accent, background: `${t.accent}10` },
                                    borderRadius: "9px",
                                }}
                            >
                                <SettingsRounded sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
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
