// src/components/auth/LoginPage.tsx
import React, { useState, type FC } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod/v4";
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
    MenuItem,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import BoltRounded from "@mui/icons-material/BoltRounded";
import { useAuthStore } from "../../store/authStore.ts";
import { authApi } from "../../api/authApi.ts";
import { AUTH_REGISTER_CONFIG_QK } from "../../utils/queryKeys.ts";
import { useTheme } from '../theme/useTheme';
import ThemeSwitch from "../theme/ThemeSwitch.tsx";
import useString from "../../hooks/useString.ts";
import str from "../../strings/str.ts";
import cfl from "../../utils/helpers.ts";

// Employee code convention: "UKR" + 1-7 uppercase letters/digits (e.g.
// UKR7101004). Mirrors the backend regex in jwt_auth.py's /jwt/register —
// keep both in sync if the convention ever changes.
const EMPLOYEE_CODE_REGEX = /^UKR[A-Z0-9]{1,7}$/;
const registerCodeSchema = z.string().regex(EMPLOYEE_CODE_REGEX, "invalidEmployeeCode");

const LoginPage: FC = () => {
    const { t } = useTheme();
    const navigate = useNavigate();
    const { access_token, setTokens } = useAuthStore();
    const getString = useString({ str });

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Self-registration (offered only when the app setting is on). Fetch
    // failure (backend unreachable / endpoint missing) just hides the option.
    const { data: registerConfig = null } = useQuery({
        queryKey: AUTH_REGISTER_CONFIG_QK,
        queryFn: authApi.registerConfig,
        staleTime: Infinity,
        retry: false,
    });
    const [mode, setMode] = useState<"login" | "register">("login");
    const [regCode, setRegCode] = useState("");
    const [regCodeError, setRegCodeError] = useState<string | null>(null);
    const [regName, setRegName] = useState("");
    const [regEmailLocal, setRegEmailLocal] = useState("");
    // User's explicit pick wins; otherwise default to the first allowed domain.
    const [regDomainPick, setRegDomainPick] = useState("");
    const regDomain = regDomainPick || registerConfig?.domains[0] || "";

    const handleRegister = async () => {
        if (!regCode.trim() || !regName.trim() || !regEmailLocal.trim() || !regDomain) {
            setError(cfl(getString("fillAllRegisterFields")) || "Please fill in all fields.");
            return;
        }
        // Validate the normalised code (trim + uppercase) so "ukr7101004" still
        // passes — the backend applies the same normalisation before re-checking.
        const normalizedCode = regCode.trim().toUpperCase();
        const codeCheck = registerCodeSchema.safeParse(normalizedCode);
        if (!codeCheck.success) {
            setRegCodeError(codeCheck.error.issues[0]?.message ?? "invalidEmployeeCode");
            return;
        }
        setRegCodeError(null);
        setError(null);
        setLoading(true);
        try {
            const email = `${regEmailLocal.trim()}@${regDomain}`;
            await authApi.register(normalizedCode, regName.trim(), email);
            // Back to login, prefill the username with the new code.
            setUsername(normalizedCode);
            setMode("login");
            setSuccess(cfl(getString("registrationSuccess")) || "Registration successful.");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!username.trim() || !password.trim()) {
            setError(cfl(getString("inputLoginAndPasswordPlease"))||"Please enter both username and password.");
            return;
        }

        setError(null);
        setLoading(true);

        try {
            // 1. Get token. RootLayout's effect fetches the user profile on
            //    access_token change, so we don't await /me here — navigating
            //    immediately keeps the redirect tight.
            const { access_token, refresh_token } = await authApi.login(username.trim(), password);
            setTokens(access_token, refresh_token);

            // 2. Navigate to the root dispatcher, which forwards to the user's
            //    default menu (replace so Back doesn't return to login).
            await navigate({ to: "/", replace: true });
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

    // Once authenticated we're mid-redirect. If the translations gate in
    // RootLayout remounts this route during the transition, show a spinner
    // (matching RootLayout's) instead of a fresh, empty login form.
    if (access_token) {
        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    background: t.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

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
                {/* <Typography
                    variant="h5"
                    fontWeight={600}
                    fontStyle="italic"
                    letterSpacing="-0.02em"
                    color={t.text}
                    mb={3}
                >
                    {cfl(getString("welcomeBack"))}
                </Typography> */}

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
                            <BoltRounded sx={{ fontSize: 26, color: "#fff" }} />
                        </Box>
                        <Typography
                            variant="h6"
                            fontWeight={600}
                            letterSpacing="-0.02em"
                            color={t.text}
                        >
                            {mode === "register"
                                ? getString("registerTitle")
                                : getString("signUpToTalentHRM")}
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

                {/* Success alert (after registration) */}
                {success && (
                    <Alert
                        severity="success"
                        sx={{
                            mb: 2.5,
                            borderRadius: "10px",
                            fontSize: 13,
                            py: 0.75,
                        }}
                        onClose={() => setSuccess(null)}
                    >
                        {success}
                    </Alert>
                )}

                {mode === "register" ? (
                    /* ── Register form ─────────────────────────────────────── */
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <TextField
                            label={cfl(getString("employeeCode"))}
                            value={regCode}
                            onChange={(e) => { setRegCode(e.target.value); setRegCodeError(null); }}
                            autoFocus
                            size="small"
                            fullWidth
                            error={!!regCodeError}
                            helperText={regCodeError ? (getString(regCodeError) || regCodeError) : " "}
                            sx={fieldSx(t)}
                            slotProps={{ htmlInput: { maxLength: 10 } }}
                        />
                        <TextField
                            label={cfl(getString("fullName"))}
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            size="small"
                            fullWidth
                            sx={fieldSx(t)}
                        />
                        <Box sx={{ display: "flex", gap: 1 }}>
                            <TextField
                                label={cfl(getString("emailLocalPart"))}
                                value={regEmailLocal}
                                onChange={(e) => setRegEmailLocal(e.target.value)}
                                size="small"
                                sx={{ ...fieldSx(t), flex: 1.4 }}
                            />
                            <TextField
                                select
                                variant="outlined"
                                label={cfl(getString("emailDomain"))}
                                value={regDomain}
                                onChange={(e) => setRegDomainPick(e.target.value)}
                                size="small"
                                sx={{ ...fieldSx(t), flex: 1 }}
                            >
                                {(registerConfig?.domains ?? []).map((d) => (
                                    <MenuItem key={d} value={d} sx={{ fontSize: 13 }}>
                                        @{d}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        <Button
                            variant="contained"
                            disableElevation
                            fullWidth
                            onClick={handleRegister}
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
                                cfl(getString("createAccount"))
                            )}
                        </Button>

                        <Button
                            variant="text"
                            size="small"
                            onClick={() => { setMode("login"); setError(null); }}
                            sx={{ textTransform: "none", fontSize: 13, color: t.textMuted }}
                        >
                            {cfl(getString("backToSignIn"))}
                        </Button>
                    </Box>
                ) : (
                /* ── Login form ────────────────────────────────────────────── */
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

                    {/* Register link — only when the app setting enables it */}
                    {registerConfig?.enabled && (
                        <Button
                            variant="text"
                            size="small"
                            onClick={() => { setMode("register"); setError(null); setSuccess(null); }}
                            sx={{ textTransform: "none", fontSize: 13, color: t.textMuted }}
                        >
                            {cfl(getString("noAccountRegister"))}
                        </Button>
                    )}
                </Box>
                )}
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