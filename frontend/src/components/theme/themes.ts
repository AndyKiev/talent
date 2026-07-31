// src/theme/themes.ts
//
// Single source of truth for theme colours.
// Add a new theme = add one entry to `themes`. Nothing else to touch.
// Token shape is intentionally kept identical to the original light/dark set so
// every existing `t.cardBg` / `t.textMid` / `t.rowHover` consumer keeps working.
//
// Colour families (pairs — toggle flips bright↔dark within the same family):
//   graphite:  graphiteLight / graphite — cool steel grey
//   neutral:   light / dark          — pure greyscale, no hue
//   blue:      blueLight / blueDark  — former light / dark (blue-slate)
//   sand:      sand / sandDark       — warm beige / warm dark brown
//   forest:    forest / forestDark   — green / dark green
//   rose:      rose / roseDark       — pink  / dark burgundy
//   cyan:      cyanLight / cyan      — light teal / dark teal

export type ThemeKey =
  | "graphiteLight"
  | "graphite"
  | "light"
  | "dark"
  | "blueLight"
  | "blueDark"
  | "sand"
  | "sandDark"
  | "forest"
  | "forestDark"
  | "rose"
  | "roseDark"
  | "cyanLight"
  | "cyan";

export interface Theme {
  /** MUI palette.mode + any isDark checks in components */
  isDark: boolean;
  /** translation key resolved through getString (see ThemeSwitch menu) */
  labelKey: string;
  /** solid page colour for MUI background.default (bg is a gradient) */
  appBg: string;

  bg: string;
  cardBg: string;
  cardBg2: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
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

// ---------------------------------------------------------------------------
// Colour-family map — which bright key pairs with which dark key.
// The toggle button uses this to stay within the same family.
// ---------------------------------------------------------------------------
export const THEME_FAMILIES: Record<ThemeKey, ThemeKey> = {
  graphiteLight: "graphite",
  graphite: "graphiteLight",
  light: "dark",
  dark: "light",
  blueLight: "blueDark",
  blueDark: "blueLight",
  sand: "sandDark",
  sandDark: "sand",
  forest: "forestDark",
  forestDark: "forest",
  rose: "roseDark",
  roseDark: "rose",
  cyanLight: "cyan",
  cyan: "cyanLight",
};

export const themes: Record<ThemeKey, Theme> = {
  // ── Graphite (cool steel grey) ───────────────────────────────────────
  graphiteLight: {
    isDark: false,
    labelKey: "themeGraphiteLight",
    appBg: "#f2f3f5",
    bg: "linear-gradient(135deg, #f2f3f5 0%, #e8eaed 100%)",
    cardBg: "#ffffff",
    cardBg2: "#f4f5f7",
    border: "#cbced4",
    borderLight: "#e3e5e9",
    text: "#1d1f23",
    textSecondary: "#5b6068",
    textMid: "#33373d",
    textMuted: "#5b6068",
    textFaint: "#93989f",
    inputBg: "#ffffff",
    inputBgDis: "#e8eaed",
    rowHover: "#edeff2",
    rowAlt: "#f7f8f9",
    rowBase: "#ffffff",
    pillBg: "#e6e8ec",
    headerBg: "#e8eaed",
    headerText: "#464b53",
    accent: "#4b5563",
    disabledText: "#71767e",
    disabledBg: "#e8eaed",
  },
  graphite: {
    isDark: true,
    labelKey: "themeGraphite",
    appBg: "#16181c",
    bg: "linear-gradient(135deg, #16181c 0%, #1c1f24 100%)",
    cardBg: "#202429",
    cardBg2: "#252a30",
    border: "#3d434c",
    borderLight: "#2f343b",
    text: "#e6e8ec",
    textSecondary: "#98a0ab",
    textMid: "#c7ccd4",
    textMuted: "#98a0ab",
    textFaint: "#626a75",
    inputBg: "#202429",
    inputBgDis: "#1a1d21",
    rowHover: "#282d34",
    rowAlt: "#1e2126",
    rowBase: "#202429",
    pillBg: "#2e343c",
    headerBg: "#1b1e23",
    headerText: "#a7b0bb",
    accent: "#8b95a3",
    disabledText: "#7b828c",
    disabledBg: "#1a1d21",
  },

  // ── Neutral (greyscale) ──────────────────────────────────────────────
  light: {
    isDark: false,
    labelKey: "light",
    appBg: "#fafafa",
    bg: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
    cardBg: "#ffffff",
    cardBg2: "#f7f7f7",
    border: "#cccccc",
    borderLight: "#e5e5e5",
    text: "#111111",
    textSecondary: "#555555",
    textMid: "#2a2a2a",
    textMuted: "#555555",
    textFaint: "#999999",
    inputBg: "#ffffff",
    inputBgDis: "#eeeeee",
    rowHover: "#f2f2f2",
    rowAlt: "#fafafa",
    rowBase: "#ffffff",
    pillBg: "#ebebeb",
    headerBg: "#f0f0f0",
    headerText: "#444444",
    accent: "#333333",
    disabledText: "#777777",
    disabledBg: "#ebebeb",
  },
  dark: {
    isDark: true,
    labelKey: "dark",
    appBg: "#0d0d0d",
    bg: "linear-gradient(135deg, #0d0d0d 0%, #141414 100%)",
    cardBg: "#1a1a1a",
    cardBg2: "#1e1e1e",
    border: "#3a3a3a",
    borderLight: "#2e2e2e",
    text: "#f0f0f0",
    textSecondary: "#999999",
    textMid: "#d0d0d0",
    textMuted: "#999999",
    textFaint: "#5c5c5c",
    inputBg: "#1e1e1e",
    inputBgDis: "#181818",
    rowHover: "#242424",
    rowAlt: "#1c1c1c",
    rowBase: "#1a1a1a",
    pillBg: "#2a2a2a",
    headerBg: "#1d1d1d",
    headerText: "#aaaaaa",
    accent: "#e0e0e0",
    disabledText: "#777777",
    disabledBg: "#1b1b1b",
  },

  // ── Blue (formerly "light" / "dark") ─────────────────────────────────
  blueLight: {
    isDark: false,
    labelKey: "themeBlueLight",
    appBg: "#f4f7fb",
    bg: "linear-gradient(135deg, #f4f7fb 0%, #eef1f7 100%)",
    cardBg: "#ffffff",
    cardBg2: "#f6f7fa",
    border: "#c5cad6",
    borderLight: "#e2e5ed",
    text: "#1a2333",
    textSecondary: "#5a6b7f",
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
  blueDark: {
    isDark: true,
    labelKey: "themeBlueDark",
    appBg: "#0f1318",
    bg: "linear-gradient(135deg, #0f1318 0%, #141920 100%)",
    cardBg: "#1a2130",
    cardBg2: "#1e2635",
    border: "#364155",
    borderLight: "#2b3344",
    text: "#e8edf5",
    textSecondary: "#8a9bb5",
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

  // ── Sand ─────────────────────────────────────────────────────────────
  sand: {
    isDark: false,
    labelKey: "themeSand",
    appBg: "#f6f1e7",
    bg: "linear-gradient(135deg, #f6f1e7 0%, #efe7d9 100%)",
    cardBg: "#fffdf8",
    cardBg2: "#f4ecdd",
    border: "#e4d9c5",
    borderLight: "#efe7d9",
    text: "#3d3527",
    textSecondary: "#7a6c56",
    textMid: "#5c4f3b",
    textMuted: "#7a6c56",
    textFaint: "#a8987e",
    inputBg: "#fffdf8",
    inputBgDis: "#ece3d3",
    rowHover: "#f4ecdd",
    rowAlt: "#faf5ec",
    rowBase: "#fffdf8",
    pillBg: "#eee2cd",
    headerBg: "#efe7d9",
    headerText: "#6b5c42",
    accent: "#b4762a",
    disabledText: "#8a7a60",
    disabledBg: "#ece3d3",
  },
  sandDark: {
    isDark: true,
    labelKey: "themeSandDark",
    appBg: "#1a1610",
    bg: "linear-gradient(135deg, #1a1610 0%, #201b14 100%)",
    cardBg: "#241e15",
    cardBg2: "#29231a",
    border: "#4a3f2f",
    borderLight: "#3a3024",
    text: "#efe4ce",
    textSecondary: "#9e8d6f",
    textMid: "#d6c9a8",
    textMuted: "#9e8d6f",
    textFaint: "#6b5d46",
    inputBg: "#241e15",
    inputBgDis: "#1c1711",
    rowHover: "#2e261b",
    rowAlt: "#201b14",
    rowBase: "#241e15",
    pillBg: "#342b1e",
    headerBg: "#1e1912",
    headerText: "#b8a478",
    accent: "#d4a44c",
    disabledText: "#8a7a55",
    disabledBg: "#1c1711",
  },

  // ── Forest ───────────────────────────────────────────────────────────
  forest: {
    isDark: false,
    labelKey: "themeForest",
    appBg: "#f1f6f1",
    bg: "linear-gradient(135deg, #f1f6f1 0%, #e6efe6 100%)",
    cardBg: "#ffffff",
    cardBg2: "#eef4ee",
    border: "#d7e4d7",
    borderLight: "#e6efe6",
    text: "#16261a",
    textSecondary: "#4f6b55",
    textMid: "#2f4a37",
    textMuted: "#4f6b55",
    textFaint: "#89a08e",
    inputBg: "#ffffff",
    inputBgDis: "#e6efe6",
    rowHover: "#eaf3ea",
    rowAlt: "#f5faf5",
    rowBase: "#ffffff",
    pillBg: "#e0ece0",
    headerBg: "#e6efe6",
    headerText: "#3d5a44",
    accent: "#2f855a",
    disabledText: "#5f7a66",
    disabledBg: "#e6efe6",
  },
  forestDark: {
    isDark: true,
    labelKey: "themeForestDark",
    appBg: "#0f1a12",
    bg: "linear-gradient(135deg, #0f1a12 0%, #142018 100%)",
    cardBg: "#162419",
    cardBg2: "#1a291e",
    border: "#2d4a33",
    borderLight: "#223b28",
    text: "#dcf0df",
    textSecondary: "#7ea886",
    textMid: "#b7d8bb",
    textMuted: "#7ea886",
    textFaint: "#4f6e56",
    inputBg: "#162419",
    inputBgDis: "#101b14",
    rowHover: "#1e2c22",
    rowAlt: "#131f17",
    rowBase: "#162419",
    pillBg: "#223528",
    headerBg: "#121c15",
    headerText: "#8cc094",
    accent: "#4ade80",
    disabledText: "#5d7a63",
    disabledBg: "#101b14",
  },

  // ── Rose ─────────────────────────────────────────────────────────────
  rose: {
    isDark: false,
    labelKey: "themeRose",
    appBg: "#fdf4f6",
    bg: "linear-gradient(135deg, #fdf4f6 0%, #f8e8ec 100%)",
    cardBg: "#ffffff",
    cardBg2: "#fbeef1",
    border: "#f0dae0",
    borderLight: "#f8e8ec",
    text: "#2b1720",
    textSecondary: "#75505d",
    textMid: "#4a2d38",
    textMuted: "#75505d",
    textFaint: "#a8848f",
    inputBg: "#ffffff",
    inputBgDis: "#f8e8ec",
    rowHover: "#fbeef1",
    rowAlt: "#fef7f9",
    rowBase: "#ffffff",
    pillBg: "#f6e2e8",
    headerBg: "#f8e8ec",
    headerText: "#6a4550",
    accent: "#be185d",
    disabledText: "#8a6069",
    disabledBg: "#f8e8ec",
  },
  roseDark: {
    isDark: true,
    labelKey: "themeRoseDark",
    appBg: "#1a1015",
    bg: "linear-gradient(135deg, #1a1015 0%, #20151b 100%)",
    cardBg: "#241820",
    cardBg2: "#291c24",
    border: "#4a2d3a",
    borderLight: "#3a2330",
    text: "#f0dce4",
    textSecondary: "#a87d8f",
    textMid: "#ddbac7",
    textMuted: "#a87d8f",
    textFaint: "#6b4f5a",
    inputBg: "#241820",
    inputBgDis: "#1b1116",
    rowHover: "#2e1e26",
    rowAlt: "#1f151a",
    rowBase: "#241820",
    pillBg: "#34222b",
    headerBg: "#1d1419",
    headerText: "#c48da0",
    accent: "#f472b6",
    disabledText: "#8a5f6e",
    disabledBg: "#1b1116",
  },

  // ── Cyan ─────────────────────────────────────────────────────────────
  cyan: {
    isDark: true,
    labelKey: "themeCyan",
    appBg: "#071a1f",
    bg: "linear-gradient(135deg, #071a1f 0%, #0b242c 100%)",
    cardBg: "#0f2f39",
    cardBg2: "#123540",
    border: "#1c4c5a",
    borderLight: "#153b47",
    text: "#e2f7fb",
    textSecondary: "#93c3ce",
    textMid: "#bfe6ee",
    textMuted: "#93c3ce",
    textFaint: "#5f8e99",
    inputBg: "#0f2f39",
    inputBgDis: "#0b242c",
    rowHover: "#153b47",
    rowAlt: "#0d2a33",
    rowBase: "#0f2f39",
    pillBg: "#17434f",
    headerBg: "#0d2a33",
    headerText: "#7db8c6",
    accent: "#22d3ee",
    disabledText: "#5f8e99",
    disabledBg: "#0d2a33",
  },
  cyanLight: {
    isDark: false,
    labelKey: "themeCyanLight",
    appBg: "#e8f7f9",
    bg: "linear-gradient(135deg, #e8f7f9 0%, #daf0f3 100%)",
    cardBg: "#ffffff",
    cardBg2: "#eef7f8",
    border: "#c0dee3",
    borderLight: "#daf0f3",
    text: "#0b2e35",
    textSecondary: "#3d727b",
    textMid: "#16444d",
    textMuted: "#3d727b",
    textFaint: "#78a2a8",
    inputBg: "#ffffff",
    inputBgDis: "#daf0f3",
    rowHover: "#e3f4f6",
    rowAlt: "#f2fafb",
    rowBase: "#ffffff",
    pillBg: "#d4ecef",
    headerBg: "#daf0f3",
    headerText: "#2d5c63",
    accent: "#0891b2",
    disabledText: "#5c878f",
    disabledBg: "#daf0f3",
  },
};

export const THEME_KEYS = Object.keys(themes) as ThemeKey[];

export const DEFAULT_THEME: ThemeKey = "dark";