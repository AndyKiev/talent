import {
    createContext,
    useContext,
    useState,
    useMemo,
    type FC,
    type ReactNode,
} from "react";
import {
    createTheme,
    ThemeProvider as MuiThemeProvider,
    CssBaseline,
} from "@mui/material";
import { themes, type Theme as AppTheme } from "./themes"; // ← Alias your custom Theme

interface ThemeContextValue {
    mode: "light" | "dark";
    toggle: () => void;
    t: AppTheme; // ← Use the aliased type
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = (): ThemeContextValue => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
};

export const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<"light" | "dark">("dark");
    const toggle = () => setMode((m) => (m === "light" ? "dark" : "light"));
    const t = themes[mode];

    const muiTheme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    primary: { main: t.accent },
                    background: {
                        default: mode === "light" ? "#f4f7fb" : "#0f1318",
                        paper: t.cardBg,
                    },
                    text: {
                        primary: t.text,
                        secondary: t.textMuted,
                        disabled: t.disabledText,
                    },
                    divider: t.border,
                },
                typography: {
                    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                },
                shape: { borderRadius: 10 },
                components: {
                    MuiPaper: {
                        styleOverrides: {
                            root: { backgroundImage: "none" },
                        },
                    },
                    MuiButton: {
                        styleOverrides: {
                            root: { textTransform: "none", fontWeight: 600 },
                        },
                    },
                    MuiTab: {
                        styleOverrides: {
                            root: { textTransform: "none", fontWeight: 500, minHeight: 48 },
                        },
                    },
                    MuiOutlinedInput: {
                        styleOverrides: {
                            root: {
                                backgroundColor: t.inputBg,
                                "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor: t.border,
                                },
                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                    borderColor: t.accent,
                                },
                            },
                        },
                    },
                    MuiSelect: {
                        styleOverrides: {
                            select: { paddingTop: "9px", paddingBottom: "9px" },
                        },
                    },
                },
            }),
        [mode, t]
    );

    return (
        <ThemeContext.Provider value={{ mode, toggle, t }}>
            <MuiThemeProvider theme={muiTheme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};