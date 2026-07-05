// Root landing: forward the user to their default menu (user override >
// app-level `default_menu` setting > first visible menu > /settings), so a
// user without access to /employees never hits a permission error on login.
import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Box, CircularProgress } from "@mui/material";
import { useDefaultMenu } from "../hooks/useDefaultMenu";

function RootRedirect() {
    const navigate = useNavigate();
    const { path, ready } = useDefaultMenu();

    useEffect(() => {
        if (ready && path) {
            navigate({ to: path as "/", replace: true });
        }
    }, [ready, path, navigate]);

    return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
            <CircularProgress />
        </Box>
    );
}

export const Route = createFileRoute("/")({
    component: RootRedirect,
});
