// src/components/layout/AccessTestDialog.tsx
// Developer-only dialog to enter/update/exit "test as group" mode: act as only
// the selected authorisation groups (losing bypass) to manually test access.
import { type FC, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Typography,
    Box,
    Alert,
    CircularProgress,
} from "@mui/material";
import { accessTestApi } from "./accessTestApi";
import { authApi } from "../../api/authApi";
import { useAuthStore } from "../../store/authStore";
import { queryClient } from "../../api/queryClient";
import { ACCESS_TEST_QK } from "../../utils/queryKeys";
import useString from "../../hooks/useString";
import cfl from "../../utils/helpers.ts";

interface AccessTestDialogProps {
    open: boolean;
    onClose: () => void;
    onNotify: (message: string, severity: "success" | "error") => void;
}

const AccessTestDialog: FC<AccessTestDialogProps> = ({ open, onClose, onNotify }) => {
    const getString = useString();
    const { setUser } = useAuthStore();
    const [selected, setSelected] = useState<Set<number>>(new Set());

    const { data: state, isLoading } = useQuery({
        queryKey: ACCESS_TEST_QK,
        queryFn: accessTestApi.fetchState,
        enabled: open,
        staleTime: 0,
    });

    // Seed the checkboxes from the persisted mode whenever the dialog (re)opens.
    useEffect(() => {
        if (open && state) setSelected(new Set(state.group_ids));
    }, [open, state]);

    // After any change: refresh identity (groups + flags) then blow away every
    // cached query so menus and permission-gated views re-evaluate immediately.
    const refreshIdentity = async (message: string) => {
        const me = await authApi.me();
        setUser(me);
        await queryClient.invalidateQueries();
        onNotify(message, "success");
        onClose();
    };

    const onError = (err: unknown) => {
        const detail = isAxiosError(err)
            ? (err.response?.data as { detail?: string } | undefined)?.detail
            : undefined;
        onNotify(detail || getString("updateFailed"), "error");
    };

    const enterMutation = useMutation({
        mutationFn: () => accessTestApi.setContext([...selected]),
        onSuccess: (res) =>
            refreshIdentity(
                getString("accessTestingEntered", { groups: res.group_names.join(", ") })
            ),
        onError,
    });

    const exitMutation = useMutation({
        mutationFn: accessTestApi.clearContext,
        onSuccess: () => refreshIdentity(getString("accessTestingExited")),
        onError,
    });

    const busy = enterMutation.isPending || exitMutation.isPending;

    const toggle = (id: number) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{cfl(getString("accessTestingDialogTitle"))}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {getString("accessTestingDialogDesc")}
                </Typography>

                {state?.active && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {getString("accessTestingTooltipActive", {
                            groups: state.group_names.join(", "),
                        })}
                    </Alert>
                )}

                {isLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <FormGroup>
                        {(state?.available_groups ?? []).map((g) => (
                            <FormControlLabel
                                key={g.id}
                                control={
                                    <Checkbox
                                        checked={selected.has(g.id)}
                                        onChange={() => toggle(g.id)}
                                        disabled={busy}
                                    />
                                }
                                label={g.name}
                            />
                        ))}
                    </FormGroup>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                {state?.active && (
                    <Button
                        color="warning"
                        variant="outlined"
                        onClick={() => exitMutation.mutate()}
                        disabled={busy}
                        sx={{ mr: "auto" }}
                    >
                        {cfl(getString("accessTestingExit"))}
                    </Button>
                )}
                <Button onClick={onClose} disabled={busy} color="inherit">
                    {cfl(getString("cancel"))}
                </Button>
                <Button
                    variant="contained"
                    color="warning"
                    onClick={() => {
                        if (selected.size === 0) {
                            onNotify(getString("accessTestingSelectAtLeastOne"), "error");
                            return;
                        }
                        enterMutation.mutate();
                    }}
                    disabled={busy || selected.size === 0}
                >
                    {cfl(getString("accessTestingApply"))}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AccessTestDialog;
