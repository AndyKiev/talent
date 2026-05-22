// src/theme/themes.ts
export interface Theme {
    bg: string;
    cardBg: string;
    cardBg2: string;
    border: string;
    borderLight: string;
    text: string;
    textSecondary: string;  // ← Add this
    textMid: string;
    textMuted: string;
    textFaint: string;
    inputBg: string;
    inputBgDis: string;
    rowHover: string;
    rowAlt: string;
    rowBase: string;
    pillBg: string;
    headerBg: string;
    headerText: string;
    accent: string;
    disabledText: string;
    disabledBg: string;
}

export const themes: Record<"light" | "dark", Theme> = {
    light: {
        bg: "linear-gradient(135deg, #f4f7fb 0%, #eef1f7 100%)",
        cardBg: "#ffffff",
        cardBg2: "#f6f7fa",
        border: "#c5cad6",
        borderLight: "#e2e5ed",
        text: "#1a2333",
        textSecondary: "#5a6b7f",  // ← Add this (same as textMuted)
        textMid: "#2d3a4a",
        textMuted: "#5a6b7f",
        textFaint: "#8b99a9",
        inputBg: "#ffffff",
        inputBgDis: "#ebeef3",
        rowHover: "#edf1f8",
        rowAlt: "#f8f9fc",
        rowBase: "#ffffff",
        pillBg: "#e8ecf3",
        headerBg: "#eef1f7",
        headerText: "#3d4f63",
        accent: "#3d6df5",
        disabledText: "#697a8f",
        disabledBg: "#e8ebf2",
    },
    dark: {
        bg: "linear-gradient(135deg, #0f1318 0%, #141920 100%)",
        cardBg: "#1a2130",
        cardBg2: "#1e2635",
        border: "#364155",
        borderLight: "#2b3344",
        text: "#e8edf5",
        textSecondary: "#8a9bb5",  // ← Add this (same as textMuted)
        textMid: "#c8d2e0",
        textMuted: "#8a9bb5",
        textFaint: "#566580",
        inputBg: "#1e2940",
        inputBgDis: "#192234",
        rowHover: "#232c40",
        rowAlt: "#1c2435",
        rowBase: "#1a2130",
        pillBg: "#263144",
        headerBg: "#1d2536",
        headerText: "#9aaccc",
        accent: "#6089ff",
        disabledText: "#8a9bb5",
        disabledBg: "#1b2436",
    },
};