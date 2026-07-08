// src/components/layout/UserMenu.tsx
// Username chip in the AppBar → dropdown with: theme switch, app-language
// switch (chip + edit → select, persisted to employees.lang_id), sign out.
import { type FC, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
    Alert,
    Box,
    Chip,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Select,
    Snackbar,
    Tooltip,
    Typography,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import EditRounded from "@mui/icons-material/EditRounded";
import { LogoutRounded } from "@mui/icons-material";
import { useTheme } from "../theme/ThemeContext";
import ThemeSwitch from "../theme/ThemeSwitch";
import { useAuthStore } from "../../store/authStore";
import { authApi, type MyLangUpdateResponse } from "../../api/authApi";
import { LANGS_QK } from "../../utils/queryKeys";
import useString from "../../hooks/useString";
import cfl from "../../utils/helpers.ts";

const UserMenu: FC = () => {
    const { t } = useTheme();
    const getString = useString();
    const navigate = useNavigate();
    const { user, setUser, logout } = useAuthStore();

    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [editingLang, setEditingLang] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error";
    }>({ open: false, message: "", severity: "success" });

    const showNotification = (message: string, severity: "success" | "error" = "success") =>
        setSnackbar({ open: true, message, severity });

    // Languages are only needed once the user opens the menu.
    const { data: langs = [] } = useQuery({
        queryKey: LANGS_QK,
        queryFn: authApi.langs,
        enabled: anchor != null,
        staleTime: 60 * 60_000,
    });

    const langMutation = useMutation({
        mutationFn: authApi.updateMyLang,
        onSuccess: (res: MyLangUpdateResponse) => {
            // New lang lands in the auth store → every getString consumer
            // re-renders in the new language (all langs are already in memory).
            setUser(res.user);
            setEditingLang(false);
            showNotification(res.detail);
        },
        onError: (err: unknown) => {
            const detail = isAxiosError(err)
                ? (err.response?.data as { detail?: string } | undefined)?.detail
                : undefined;
            showNotification(detail || getString("updateFailed"), "error");
        },
    });

    const closeMenu = () => {
        setAnchor(null);
        setEditingLang(false);
    };

    const handleLogout = async () => {
        closeMenu();
        logout();
        await navigate({ to: "/auth/login" });
    };

    if (!user) return null;

    const rowSx = {
        px: 2,
        py: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        minWidth: 260,
    } as const;

    return (
        <>
            <Tooltip title={cfl(getString("userMenuHint"))}>
                <Chip
                    label={user.name}
                    size="small"
                    onClick={(e) => setAnchor(e.currentTarget)}
                    sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        height: 28,
                        background: `${t.accent}14`,
                        color: t.accent,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        transition: "all 0.15s",
                        "&:hover": {
                            background: `${t.accent}28`,
                            boxShadow: `0 0 0 1px ${t.accent}40`,
                        },
                    }}
                />
            </Tooltip>

            <Menu
                open={anchor != null}
                anchorEl={anchor}
                onClose={closeMenu}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
                {/* Row 1 — theme */}
                <Box sx={rowSx}>
                    <Typography fontSize={13} fontWeight={600} color={t.textMuted}>
                        {cfl(getString("theme"))}
                    </Typography>
                    <ThemeSwitch />
                </Box>
                <Divider />

                {/* Row 2 — app language */}
                <Box sx={rowSx}>
                    <Typography fontSize={13} fontWeight={600} color={t.textMuted}>
                        {cfl(getString("language"))}
                    </Typography>
                    {editingLang ? (
                        <Select
                            variant="outlined"
                            size="small"
                            autoFocus
                            value={user.lang_id ?? ""}
                            disabled={langMutation.isPending}
                            onChange={(e) => {
                                const langId = Number(e.target.value);
                                if (langId && langId !== user.lang_id) {
                                    langMutation.mutate(langId);
                                } else {
                                    setEditingLang(false);
                                }
                            }}
                            sx={{ minWidth: 140, fontSize: 13 }}
                        >
                            {langs.map((lang) => (
                                <MenuItem key={lang.id} value={lang.id}>
                                    {cfl(getString(lang.name))}
                                </MenuItem>
                            ))}
                        </Select>
                    ) : (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Chip
                                label={user.lang ? cfl(getString(user.lang.name)) : "—"}
                                size="small"
                                sx={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    background: `${t.accent}14`,
                                    color: t.accent,
                                }}
                            />
                            <Tooltip title={cfl(getString("edit"))}>
                                <IconButton size="small" onClick={() => setEditingLang(true)}>
                                    <EditRounded sx={{ fontSize: 16, color: t.textMuted }} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}
                </Box>
                <Divider />

                {/* Row 3 — sign out */}
                <MenuItem onClick={handleLogout} sx={{ minWidth: 260 }}>
                    <ListItemIcon>
                        <LogoutRounded fontSize="small" sx={{ color: t.textMuted }} />
                    </ListItemIcon>
                    <ListItemText
                        primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                    >
                        {cfl(getString("signOut"))}
                    </ListItemText>
                </MenuItem>
            </Menu>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity={snackbar.severity} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default UserMenu;
