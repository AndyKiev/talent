import { type FC } from "react";
import { Box, Button, Typography } from "@mui/material";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import { useTheme } from "./ThemeContext";
import useString from "../../hooks/useString.ts";
import str from "../../strings/str.ts";

const ThemeSwitch: FC = () => {
    const { mode, toggle, t } = useTheme();
    const isDark = mode === "dark";
    const getString = useString({ str });
    return (
        <Button
            onClick={toggle}
            variant="outlined"
            sx={{
                borderColor: t.border,
                borderRadius: "24px",
                px: 1.75,
                py: 0.75,
                gap: 1,
                minWidth: 0,
                "&:hover": { borderColor: t.accent },
            }}
        >
            {/* Toggle track */}
            <Box
                sx={{
                    width: 36,
                    height: 20,
                    borderRadius: "10px",
                    background: isDark ? t.accent : "#dde2ea",
                    position: "relative",
                    flexShrink: 0,
                    transition: "background 0.25s",
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        top: 3,
                        left: isDark ? 19 : 3,
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "#fff",
                        boxShadow: "0 1px 4px #00000030",
                        transition: "left 0.22s cubic-bezier(.4,0,.2,1)",
                    }}
                />
            </Box>
            <Typography
                variant="caption"
                fontWeight={600}
                color={t.textMuted}
                sx={{ userSelect: "none", display: "flex", alignItems: "center", gap: 0.5 }}
            >
                {isDark ? (
                    <DarkModeRounded sx={{ fontSize: 16 }} />
                ) : (
                    <LightModeRounded sx={{ fontSize: 16 }} />
                )}
                {isDark ? getString("dark") : getString("light")}
            </Typography>
        </Button>
    );
};

export default ThemeSwitch;