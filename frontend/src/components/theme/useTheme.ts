import { createContext, useContext } from "react";
import type { ThemeKey } from "./themes";
import type { Theme as AppTheme } from "./themes";

export interface ThemeContextValue {
    /** raw design tokens — same shape as before */
    t: AppTheme;
    /** currently picked theme key (light | dark | sand | ...) */
    themeKey: ThemeKey;
    setThemeKey: (key: ThemeKey) => void;
    availableThemes: ThemeKey[];
    /** legacy API — still light | dark, derived from the picked theme */
    mode: "light" | "dark";
    /** legacy toggle: flips between light and dark only */
    toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = (): ThemeContextValue => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
};