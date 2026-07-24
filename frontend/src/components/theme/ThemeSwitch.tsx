import { useState, type FC, type MouseEvent } from "react";
import {
    Box,
    Button,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
    Divider,
    ListSubheader,
} from "@mui/material";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import PaletteRounded from "@mui/icons-material/PaletteRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import { useTheme } from "./useTheme";
import { themes, type ThemeKey } from "./themes";
import useString from "../../hooks/useString.ts";
import str from "../../strings/str.ts";
import cfl from "../../utils/helpers.ts";

// ---------------------------------------------------------------------------
// Families — ordered for display in the palette menu.
// Each entry has an optional section label and its bright + dark members.
// ---------------------------------------------------------------------------
interface Family {
    labelKey: string;      // fallback section title (e.g. "Neutral")
    members: ThemeKey[];   // always [bright, dark]
}

const FAMILIES: Family[] = [
    { labelKey: "familyNeutral", members: ["light", "dark"] },
    { labelKey: "familyBlue",   members: ["blueLight", "blueDark"] },
    { labelKey: "familySand",   members: ["sand", "sandDark"] },
    { labelKey: "familyForest", members: ["forest", "forestDark"] },
    { labelKey: "familyRose",   members: ["rose", "roseDark"] },
    { labelKey: "familyCyan",   members: ["cyanLight", "cyan"] },
];

const ThemeSwitch: FC = () => {
    const { toggle, t, themeKey, setThemeKey } = useTheme();
    const getString = useString({ str });
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const openMenu = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
    const closeMenu = () => setAnchorEl(null);
    const pick = (key: ThemeKey) => {
        setThemeKey(key);
        closeMenu();
    };

    const isDark = t.isDark;

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {/* Toggle — flips between bright ↔ dark within the same colour family */}
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
                    {cfl(getString(t.labelKey) || themeKey)}
                </Typography>
            </Button>

            {/* Theme picker — grouped by colour family */}
            <Tooltip title={cfl(getString("chooseTheme") || "Choose theme")}>
                <IconButton size="small" onClick={openMenu} sx={{ color: t.accent }}>
                    <PaletteRounded fontSize="small" />
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={closeMenu}
                slotProps={{ paper: { sx: { maxHeight: 480 } } }}
            >
                {FAMILIES.map((family, fi) => [
                    fi > 0 ? <Divider key={`div-${fi}`} /> : null,
                    <ListSubheader
                        key={`sub-${fi}`}
                        sx={{ fontSize: "0.75rem", lineHeight: "2rem", color: t.textFaint, bgcolor: "transparent" }}
                    >
                        {cfl(getString(family.labelKey) || family.labelKey)}
                    </ListSubheader>,
                    ...family.members.map((key) => {
                        const theme = themes[key];
                        const selected = key === themeKey;
                        return (
                            <MenuItem key={key} selected={selected} onClick={() => pick(key)}>
                                <ListItemIcon>
                                    <Box
                                        sx={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: "50%",
                                            background: `linear-gradient(135deg, ${theme.appBg} 50%, ${theme.accent} 50%)`,
                                            border: `1px solid ${theme.border}`,
                                        }}
                                    />
                                </ListItemIcon>
                                <ListItemText>{cfl(getString(theme.labelKey) || key)}</ListItemText>
                                {selected && <CheckRounded fontSize="small" sx={{ ml: 1.5 }} />}
                            </MenuItem>
                        );
                    }),
                ])}
            </Menu>
        </Box>
    );
};

export default ThemeSwitch;