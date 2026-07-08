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
// Register the MuiDataGrid slots on the MUI theme `components` type so the
// global header styleOverrides below typecheck.
import type {} from "@mui/x-data-grid/themeAugmentation";
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
                    // Select/Menu options: wrap long labels (e.g. job names) instead
                    // of overflowing the popup — menu papers clip horizontal overflow,
                    // so on phones unwrapped options are unreadable. Desktop popups
                    // still size to one line when they fit; wrapping only kicks in
                    // when the viewport constrains the paper.
                    MuiMenuItem: {
                        styleOverrides: {
                            root: {
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                            },
                        },
                    },
                    // Global DataGrid HEADER style so every grid in every menu shares
                    // the same column-header look as the employees grid (the one that
                    // used useDataGridStyles). Header slots ONLY — cell/row layout is
                    // intentionally left to each grid.
                    MuiDataGrid: {
                        // Global header height (default 56) — slimmer headers across
                        // every grid in the app; per-grid columnHeaderHeight still wins.
                        defaultProps: { columnHeaderHeight: 44 },
                        styleOverrides: {
                            columnHeader: ({ theme }) => ({
                                backgroundColor: theme.palette.primary.light,
                                color: mode === "dark" ? "#000" : "#fff",
                            }),
                            columnHeaderTitle: {
                                fontWeight: "bold",
                                color: mode === "dark" ? "#000" : "#fff",
                            },
                            iconButtonContainer: {
                                "& button": { color: mode === "dark" ? "#000" : "#fff" },
                            },
                            menuIcon: {
                                "& button": { color: mode === "dark" ? "#000" : "#fff" },
                            },
                            sortIcon: {
                                color: mode === "dark" ? "#fff" : "#000",
                                opacity: 0.9,
                            },
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