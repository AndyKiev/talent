// src/components/layout/AppShell.tsx
import { type FC, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
    AppBar,
    Box,
    Toolbar,
    Typography,
    Button,
    Stack,
    IconButton,
    Menu,
    MenuItem as MuiMenuItem,
    ListItemIcon,
    ListItemText,
    Drawer,
    List,
    ListItemButton,
    Collapse,
    Divider,
    useMediaQuery,
    useTheme as useMuiTheme,
} from "@mui/material";
import CodeIcon from '@mui/icons-material/Code';
import InsightsRounded from '@mui/icons-material/InsightsRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded';
import MenuRounded from '@mui/icons-material/MenuRounded';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';
import BoltRounded from '@mui/icons-material/BoltRounded';
import { PeopleAltRounded, AdminPanelSettingsRounded, RateReviewRounded, SchoolRounded, PersonSearchRounded, RecentActorsRounded, ForumRounded, LogoutRounded } from "@mui/icons-material";
import { useTheme as useAppTheme } from "../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import UserMenu from "./UserMenu";
import AccessTestButton from "./AccessTestButton";
import cfl from "../../utils/helpers.ts";
import useString from "../../hooks/useString.ts";
import str from "../../strings/str.ts";
import { fetchMyMenus, type MenuItem } from "./menuApi";
import { MENUS_MY_QK } from "../../utils/queryKeys";

// menus.icon (string in the DB) → MUI icon component. Unknown/missing icons
// fall back to a generic menu glyph.
const MENU_ICONS: Record<string, ReactNode> = {
    people: <PeopleAltRounded sx={{ fontSize: 16 }} />,
    insights: <InsightsRounded sx={{ fontSize: 16 }} />,
    review: <RateReviewRounded sx={{ fontSize: 16 }} />,
    school: <SchoolRounded sx={{ fontSize: 16 }} />,
    recruitment: <PersonSearchRounded sx={{ fontSize: 16 }} />,
    candidates: <RecentActorsRounded sx={{ fontSize: 16 }} />,
    interviews: <ForumRounded sx={{ fontSize: 16 }} />,
    adminPanel: <AdminPanelSettingsRounded sx={{ fontSize: 16 }} />,
    code: <CodeIcon sx={{ fontSize: 16 }} />,
    settings: <SettingsRounded sx={{ fontSize: 16 }} />,
};

const menuIcon = (icon: string | null): ReactNode =>
    (icon && MENU_ICONS[icon]) || <MenuRounded sx={{ fontSize: 16 }} />;

interface AppShellProps {
    children: ReactNode;
}

const AppShell: FC<AppShellProps> = ({ children }) => {
    const { t, mode } = useAppTheme();
    const muiTheme = useMuiTheme();
    const getString = useString({ str });
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const routerState = useRouterState();
    const currentPath = routerState.location.pathname;

    // Dynamic navigation from the menus table (filtered per-user server-side).
    const { data: menus = [] } = useQuery({
        queryKey: MENUS_MY_QK,
        queryFn: fetchMyMenus,
        enabled: !!user,
        staleTime: 5 * 60_000,
    });
    const topMenus = menus.filter((m) => m.parent_id === null);
    const childrenOf = (parentId: number) =>
        menus.filter((m) => m.parent_id === parentId);

    // Priority+ (overflow) nav: as many items as fit are shown inline, the
    // rest go under a "…" button after them. Only when NOT EVEN ONE item fits
    // (or on phones, `md` floor) does the bar switch to the hamburger, placed
    // right after the "Talent" brand. Item widths come from a hidden copy of
    // the full nav, re-measured via ResizeObserver.
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const brandRef = useRef<HTMLDivElement | null>(null);
    const rightRef = useRef<HTMLDivElement | null>(null);
    const measureRef = useRef<HTMLDivElement | null>(null);
    const [visibleCount, setVisibleCount] = useState<number | null>(null);
    const shownCount = visibleCount ?? topMenus.length;
    const showHamburger = isMobile || (topMenus.length > 0 && shownCount === 0);
    const overflowMenus = topMenus.slice(shownCount);

    useLayoutEffect(() => {
        const toolbar = toolbarRef.current;
        const measure = measureRef.current;
        if (!toolbar || !measure) return;
        const GAP = 4; // Stack spacing 0.5
        const DOTS = 44; // "…" IconButton reserve
        const update = () => {
            const brand = brandRef.current;
            const right = rightRef.current;
            if (!brand || !right) return;
            const styles = getComputedStyle(toolbar);
            const padding =
                parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
            // 40px safety margin covers toolbar gaps + brand mr.
            const available =
                toolbar.clientWidth - padding - brand.offsetWidth - right.offsetWidth - 40;
            const widths = Array.from(measure.children).map(
                (el) => (el as HTMLElement).offsetWidth,
            );
            const total = widths.reduce((a, w, i) => a + w + (i ? GAP : 0), 0);
            let count = widths.length;
            if (total > available) {
                const avail = available - DOTS;
                let used = 0;
                count = 0;
                for (const w of widths) {
                    const next = used + (count ? GAP : 0) + w;
                    if (next > avail) break;
                    used = next;
                    count++;
                }
            }
            setVisibleCount(count);
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(toolbar);
        ro.observe(measure);
        return () => ro.disconnect();
    }, [menus]);

    // "…" overflow dropdown state
    const [overflowAnchor, setOverflowAnchor] = useState<HTMLElement | null>(null);

    // Open dropdown state for items that have children.
    const [submenuAnchor, setSubmenuAnchor] = useState<{
        parentId: number;
        anchor: HTMLElement;
    } | null>(null);
    // Mobile drawer & expand state
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [expandedParents, setExpandedParents] = useState<Set<number>>(new Set());

    const navBtn = (item: MenuItem) => {
        const kids = childrenOf(item.id);
        const active =
            currentPath.startsWith(item.path) ||
            kids.some((k) => currentPath.startsWith(k.path));
        return (
            <Button
                key={item.id}
                startIcon={menuIcon(item.icon)}
                endIcon={kids.length > 0 ? <ExpandMoreRounded sx={{ fontSize: 16 }} /> : undefined}
                onClick={(e) =>
                    kids.length > 0
                        ? setSubmenuAnchor({ parentId: item.id, anchor: e.currentTarget })
                        : navigate({ to: item.path as "/" })
                }
                sx={{
                    borderRadius: "9px",
                    px: 1.75,
                    py: 0.75,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? t.accent : t.textMuted,
                    background: active ? `${t.accent}14` : "transparent",
                    textTransform: "none",
                    letterSpacing: 0,
                    "&:hover": {
                        background: `${t.accent}10`,
                        color: t.accent,
                    },
                    transition: "all 0.15s",
                }}
            >
                {cfl(getString(item.label_key))}
            </Button>
        );
    };

    // --- Desktop sub-menu dropdown (shared) ---
    const desktopSubmenu = (
        <Menu
            open={submenuAnchor != null}
            anchorEl={submenuAnchor?.anchor ?? null}
            onClose={() => setSubmenuAnchor(null)}
        >
            {(submenuAnchor ? childrenOf(submenuAnchor.parentId) : []).map((child) => (
                <MuiMenuItem
                    key={child.id}
                    selected={currentPath.startsWith(child.path)}
                    onClick={() => {
                        setSubmenuAnchor(null);
                        setOverflowAnchor(null);
                        navigate({ to: child.path as "/" });
                    }}
                >
                    <ListItemIcon>{menuIcon(child.icon)}</ListItemIcon>
                    <ListItemText>{cfl(getString(child.label_key))}</ListItemText>
                </MuiMenuItem>
            ))}
        </Menu>
    );

    // --- "…" overflow dropdown: top-level items that did not fit inline ---
    const overflowDropdown = (
        <Menu
            open={overflowAnchor != null}
            anchorEl={overflowAnchor}
            onClose={() => setOverflowAnchor(null)}
        >
            {overflowMenus.map((item) => {
                const kids = childrenOf(item.id);
                const active =
                    currentPath.startsWith(item.path) ||
                    kids.some((k) => currentPath.startsWith(k.path));
                return (
                    <MuiMenuItem
                        key={item.id}
                        selected={active}
                        onClick={(e) => {
                            if (kids.length > 0) {
                                setSubmenuAnchor({ parentId: item.id, anchor: e.currentTarget });
                            } else {
                                setOverflowAnchor(null);
                                navigate({ to: item.path as "/" });
                            }
                        }}
                    >
                        <ListItemIcon>{menuIcon(item.icon)}</ListItemIcon>
                        <ListItemText>{cfl(getString(item.label_key))}</ListItemText>
                        {kids.length > 0 && <ExpandMoreRounded sx={{ fontSize: 16, ml: 1 }} />}
                    </MuiMenuItem>
                );
            })}
        </Menu>
    );

    // --- Mobile drawer ---
    const mobileDrawer = (
        <Drawer
            anchor="left"
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            PaperProps={{ sx: { minWidth: 260, pt: 1 } }}
        >
            <Typography
                fontWeight={700}
                fontSize={15}
                letterSpacing="-0.02em"
                color={t.text}
                sx={{ px: 2, py: 1.5, userSelect: "none" }}
            >
                Talent
            </Typography>
            <List dense>
                {topMenus.map((item) => {
                    const kids = childrenOf(item.id);
                    const active =
                        currentPath.startsWith(item.path) ||
                        kids.some((k) => currentPath.startsWith(k.path));
                    const isExpanded = expandedParents.has(item.id);
                    const toggleExpand = () =>
                        setExpandedParents((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                        });
                    return (
                        <Box key={item.id}>
                            <ListItemButton
                                onClick={() => {
                                    if (kids.length > 0) {
                                        toggleExpand();
                                    } else {
                                        setMobileDrawerOpen(false);
                                        navigate({ to: item.path as "/" });
                                    }
                                }}
                                selected={active}
                                sx={{ borderRadius: 0 }}
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    {menuIcon(item.icon)}
                                </ListItemIcon>
                                <ListItemText primary={cfl(getString(item.label_key))} />
                                {kids.length > 0 &&
                                    (isExpanded ? <ExpandLessRounded fontSize="small" /> : <ExpandMoreRounded fontSize="small" />)}
                            </ListItemButton>
                            {kids.length > 0 && (
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                    <List dense disablePadding>
                                        {kids.map((child) => (
                                            <ListItemButton
                                                key={child.id}
                                                sx={{ pl: 5 }}
                                                selected={currentPath.startsWith(child.path)}
                                                onClick={() => {
                                                    setMobileDrawerOpen(false);
                                                    navigate({ to: child.path as "/" });
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 36 }}>
                                                    {menuIcon(child.icon)}
                                                </ListItemIcon>
                                                <ListItemText primary={cfl(getString(child.label_key))} />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </Collapse>
                            )}
                        </Box>
                    );
                })}
                <Divider sx={{ my: 1 }} />
                {/* Sign out (mobile) — at the bottom, clearly separated */}
                <ListItemButton
                    onClick={() => {
                        setMobileDrawerOpen(false);
                        logout();
                        navigate({ to: "/auth/login" });
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                        <LogoutRounded sx={{ fontSize: 18, color: t.textMuted }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={cfl(getString("signOut"))}
                        primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                    />
                </ListItemButton>
            </List>
        </Drawer>
    );

    return (
        <Box sx={{ minHeight: "100vh", overflowX: "hidden", background: t.bg, transition: "background 0.3s" }}>
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    background: mode === "dark"
                        ? `${t.cardBg}ee`
                        : `${t.cardBg}f0`,
                    backdropFilter: "blur(12px)",
                    borderBottom: `1px solid ${t.borderLight}`,
                    color: t.text,
                }}
            >
                <Toolbar ref={toolbarRef} sx={{ gap: 1, minHeight: "56px !important", px: { xs: 2, sm: 3 } }}>
                    {/* Brand */}
                    <Stack ref={brandRef} direction="row" alignItems="center" spacing={1} mr={3}>
                        <Box
                            sx={{
                                width: 28,
                                height: 28,
                                borderRadius: "8px",
                                background: `linear-gradient(135deg, ${t.accent}, #2d5eed)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <BoltRounded sx={{ fontSize: 18, color: "#fff" }} />
                        </Box>
                        <Typography
                            fontWeight={700}
                            fontSize={15}
                            letterSpacing="-0.02em"
                            color={t.text}
                            sx={{ userSelect: "none" }}
                        >
                            Talent
                        </Typography>
                    </Stack>

                    {/* Hamburger — right after the brand, ONLY when not even
                        one nav item fits (or on phones). */}
                    {showHamburger && (
                        <IconButton
                            aria-label={cfl(getString("menu"))}
                            onClick={() => setMobileDrawerOpen(true)}
                            sx={{ color: t.text, borderRadius: "9px" }}
                        >
                            <MenuRounded />
                        </IconButton>
                    )}

                    {/* Hidden copy of the full nav — per-item widths for the
                        overflow computation, so nothing is ever clipped. */}
                    <Box
                        ref={measureRef}
                        aria-hidden
                        sx={{
                            position: "absolute",
                            visibility: "hidden",
                            pointerEvents: "none",
                            display: "flex",
                            gap: 0.5,
                            width: "max-content",
                        }}
                    >
                        {topMenus.map((item) => navBtn(item))}
                    </Box>

                    {/* Nav: items that fit inline + "…" for the rest */}
                    {!showHamburger ? (
                        <Stack direction="row" spacing={0.5} flexGrow={1} alignItems="center">
                            {topMenus.slice(0, shownCount).map((item) => navBtn(item))}
                            {overflowMenus.length > 0 && (
                                <IconButton
                                    aria-label={cfl(getString("menu"))}
                                    size="small"
                                    onClick={(e) => setOverflowAnchor(e.currentTarget)}
                                    sx={{ color: t.textMuted, borderRadius: "9px" }}
                                >
                                    <MoreHorizRounded />
                                </IconButton>
                            )}
                        </Stack>
                    ) : (
                        <Box flexGrow={1} />
                    )}
                    {desktopSubmenu}
                    {overflowDropdown}

                    {/* Right side: access-test + user chip (always fully visible) */}
                    <Stack ref={rightRef} direction="row" alignItems="center" spacing={1}>
                        <AccessTestButton />
                        <UserMenu />
                    </Stack>
                    {mobileDrawer}
                </Toolbar>
            </AppBar>

            {/* Page content */}
            <Box component="main">{children}</Box>
        </Box>
    );
};

export default AppShell;
