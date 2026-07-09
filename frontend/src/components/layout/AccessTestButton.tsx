// src/components/layout/AccessTestButton.tsx
// Main-menu indicator + entry point for "test as group" mode. Visible only to
// developers (can_access_test). Turns vivid (warning) while impersonating.
import { type FC, useState } from "react";
import {
    IconButton,
    Tooltip,
    Chip,
    Stack,
    Snackbar,
    Alert,
} from "@mui/material";
import TheaterComedyRounded from "@mui/icons-material/TheaterComedyRounded";
import { useAuthStore } from "../../store/authStore";
import AccessTestDialog from "./AccessTestDialog";
import useString from "../../hooks/useString";
import cfl from "../../utils/helpers.ts";

const AccessTestButton: FC = () => {
    const getString = useString();
    const { user } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error";
    }>({ open: false, message: "", severity: "success" });

    const notify = (message: string, severity: "success" | "error") =>
        setSnackbar({ open: true, message, severity });

    // Only real developers/bypass users get the control. While testing, is_bypass
    // is off but can_access_test stays true, so the icon never disappears mid-test.
    if (!user?.can_access_test) return null;

    const active = !!user.access_testing;
    const testedGroups = active ? user.groups.join(", ") : "";

    return (
        <>
            <Stack direction="row" alignItems="center" spacing={0.5}>
                <Tooltip
                    title={
                        active
                            ? getString("accessTestingTooltipActive", { groups: testedGroups })
                            : cfl(getString("accessTesting"))
                    }
                >
                    <IconButton
                        size="small"
                        onClick={() => setOpen(true)}
                        sx={{
                            color: active ? "warning.main" : "text.secondary",
                            background: active ? "rgba(237,108,2,0.12)" : "transparent",
                            "&:hover": {
                                color: "warning.main",
                                background: "rgba(237,108,2,0.10)",
                            },
                            borderRadius: "9px",
                        }}
                    >
                        <TheaterComedyRounded sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
                {active && (
                    <Chip
                        label={testedGroups}
                        size="small"
                        color="warning"
                        onClick={() => setOpen(true)}
                        sx={{ fontSize: 11, fontWeight: 700, height: 22, cursor: "pointer" }}
                    />
                )}
            </Stack>

            <AccessTestDialog open={open} onClose={() => setOpen(false)} onNotify={notify} />

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

export default AccessTestButton;
