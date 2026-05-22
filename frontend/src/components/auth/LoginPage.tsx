// src/components/auth/LoginPage.tsx
import React, { useState, type FC } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useAuthStore } from "../../store/authStore.ts";
import { authApi } from "../../api/authApi.ts";
import { useTheme } from "../theme/ThemeContext.tsx";
import ThemeSwitch from "../theme/ThemeSwitch.tsx";
import useString from "../../hooks/useString.ts";
import str from "../../strings/str.ts";
import cfl from "../../utils/capitalizeFirstLetter.ts";


const LoginPage: FC = () => {
    const { t } = useTheme();
    const navigate = useNavigate();
    const { setToken, setUser } = useAuthStore();
    const getString = useString({ str });

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!username.trim() || !password.trim()) {
            setError(cfl(getString("inputLoginAndPasswordPlease"))||"Please enter both username and password.");
            return;
        }

        setError(null);
        setLoading(true);

        try {
            // 1. Get token
            const { access_token } = await authApi.login(username.trim(), password);
            setToken(access_token);

            // 2. Fetch full user profile
            const user = await authApi.me();
            setUser(user);

            // 3. Navigate to main page
            await navigate({ to: "/employees" });
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Login failed. Please check your credentials.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === "Enter") await handleSubmit();
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                background: t.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2,
                transition: "background 0.3s",
            }}
        >
            {/* Theme toggle — top right */}
            <Box sx={{ position: "fixed", top: 20, right: 24 }}>
                <ThemeSwitch />
            </Box>

            <Paper
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 360,
                    borderRadius: "18px",
                    p: { xs: 3.5, sm: 4.5 },
                    background: t.cardBg,
                    boxShadow: `0 4px 40px ${t.text}0a, 0 1px 4px ${t.text}08`,
                    border: `1px solid ${t.borderLight}`,
                }}
            >
                {/* Welcome Back - at the very top */}
                <Typography
                    variant="h5"
                    fontWeight={600}
                    fontStyle="italic"
                    letterSpacing="-0.02em"
                    color={t.text}
                    mb={3}
                >
                    {cfl(getString("welcomeBack"))}
                </Typography>

                {/* Logo / heading with subtitle */}
                <Box mb={4}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: "12px",
                                background: `linear-gradient(135deg, ${t.accent}, #2d5eed)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: `0 6px 20px ${t.accent}40`,
                                flexShrink: 0,
                            }}
                        >
                            <Typography sx={{ fontSize: 22 }}>⚡</Typography>
                        </Box>
                        <Typography
                            variant="h6"
                            fontWeight={600}
                            letterSpacing="-0.02em"
                            color={t.text}
                        >
                            {getString("signUpToTalentHRM")}
                        </Typography>
                    </Box>
                </Box>

                {/* Error alert */}
                {error && (
                    <Alert
                        severity="error"
                        sx={{
                            mb: 2.5,
                            borderRadius: "10px",
                            fontSize: 13,
                            py: 0.75,
                        }}
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}

                {/* Fields */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                        label={cfl(getString("username"))}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoComplete="username"
                        autoFocus
                        size="small"
                        fullWidth
                        sx={fieldSx(t)}
                        slotProps={{
                            inputLabel: {
                                sx: {
                                    marginBottom: '4px',
                                }
                            }
                        }}
                    />

                    <TextField
                        label={cfl(getString("password"))}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoComplete="current-password"
                        size="small"
                        fullWidth
                        sx={fieldSx(t)}
                        slotProps={{
                            inputLabel: {
                                sx: {
                                    marginBottom: '4px',
                                }
                            },
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => setShowPassword((v) => !v)}
                                            edge="end"
                                            sx={{ color: t.textMuted }}
                                        >
                                            {showPassword ? (
                                                <VisibilityOff fontSize="small" />
                                            ) : (
                                                <Visibility fontSize="small" />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />

                    <Button
                        variant="contained"
                        disableElevation
                        fullWidth
                        onClick={handleSubmit}
                        disabled={loading}
                        sx={{
                            mt: 0.5,
                            py: 1.25,
                            borderRadius: "10px",
                            background: `linear-gradient(135deg, ${t.accent}, #2d5eed)`,
                            fontSize: 14,
                            fontWeight: 600,
                            letterSpacing: "0.01em",
                            boxShadow: `0 4px 14px ${t.accent}40`,
                            "&:hover": { opacity: 0.9 },
                            "&.Mui-disabled": { opacity: 0.6 },
                        }}
                    >
                        {loading ? (
                            <CircularProgress size={20} sx={{ color: "#fff" }} />
                        ) : (
                            cfl(getString("signIn"))
                        )}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

// Shared TextField sx — keeps the form fields consistent with app theme
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fieldSx = (t: any) => ({
    "& .MuiOutlinedInput-root": {
        borderRadius: "10px",
        fontSize: 14,
        "& fieldset": { borderColor: t.borderLight },
        "&:hover fieldset": { borderColor: t.accent },
        "&.Mui-focused fieldset": { borderColor: t.accent },
    },
    "& .MuiInputLabel-root": {
        fontSize: 14,
        color: t.textMuted,
        marginBottom: '8px',
        "&.Mui-focused": { color: t.accent },
    },
    "& .MuiInputBase-input": { color: t.text },
    "& .MuiInputLabel-shrink": {
        marginBottom: '0px',
    },
});

export default LoginPage;