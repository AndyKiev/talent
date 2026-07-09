import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Divider, IconButton, Menu, MenuItem, Tab, Tabs, Typography, type SxProps, type Theme, type TabsProps } from '@mui/material';
import type { TabProps } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export interface TabItem {
    label: ReactNode;
    value: string;
    /** Optional MUI sx overrides for this tab (applied to both the visible Tab and the overflow MenuItem). */
    sx?: SxProps<Theme>;
    /** Extra props forwarded to the MUI <Tab> (e.g. drag handlers). Do NOT set label / value / sx / ref. */
    tabProps?: Omit<TabProps, 'label' | 'value' | 'sx' | 'ref'>;
}

interface ResponsiveTabsProps {
    tabs: TabItem[];
    activeTab: string;
    onChange: (value: string) => void;
    /** Optional extra props forwarded to the inner MUI <Tabs>. Do NOT set variant/scrollButtons — we manage those. */
    tabsProps?: Omit<TabsProps, 'value' | 'onChange' | 'variant' | 'scrollButtons' | 'children'>;
}

/**
 * Tabs that collapse overflowing items into a "More" (⋮) dropdown when the
 * container is too narrow.  The active tab is always kept visible.
 *
 * Measurement uses a hidden <Tabs> clone with refs on every <Tab> so widths
 * match the real MUI rendering exactly, regardless of label complexity.
 */
export function ResponsiveTabs({ tabs, activeTab, onChange, tabsProps }: ResponsiveTabsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRowRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<(HTMLElement | null)[]>([]);
    const [tabWidths, setTabWidths] = useState<number[]>([]);
    const [containerWidth, setContainerWidth] = useState(0);
    const [moreAnchorEl, setMoreAnchorEl] = useState<HTMLElement | null>(null);

    // ── Measure real tab widths via a hidden Tabs clone ──────────────────
    useLayoutEffect(() => {
        if (!measureRowRef.current) return;
        const refs = tabRefs.current;
        const widths: number[] = [];
        for (let i = 0; i < refs.length; i++) {
            widths.push((refs[i]?.offsetWidth ?? 0) + 8); // 8px for MUI Tab gap
        }
        setTabWidths(widths);
    }, [tabs]);

    // Re-measure on resize (tab widths shouldn't change, but just in case).
    useEffect(() => {
        const el = measureRowRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            const refs = tabRefs.current;
            const widths: number[] = [];
            for (let i = 0; i < refs.length; i++) {
                widths.push((refs[i]?.offsetWidth ?? 0) + 8);
            }
            setTabWidths(widths);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [tabs]);

    // ── Observe container width ──────────────────────────────────────────
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        ro.observe(el);
        setContainerWidth(el.clientWidth);
        return () => ro.disconnect();
    }, []);

    // ── Decide which tabs overflow ────────────────────────────────────────
    const visibleTabs: TabItem[] = [];
    const overflowTabs: TabItem[] = [];

    if (tabWidths.length === tabs.length && containerWidth > 0) {
        const activeIdx = tabs.findIndex((t) => t.value === activeTab);
        const MORE_BTN_WIDTH = 40;

        let used = 0;
        const visible: TabItem[] = [];
        const rest: TabItem[] = [];
        let activeIncluded = false;

        for (let i = 0; i < tabs.length; i++) {
            const w = tabWidths[i] ?? 100;

            if (tabs[i].value === activeTab) {
                visible.push(tabs[i]);
                used += w;
                activeIncluded = true;
            } else if (containerWidth - used >= w + (rest.length > 0 || !activeIncluded ? 0 : MORE_BTN_WIDTH)) {
                visible.push(tabs[i]);
                used += w;
            } else {
                rest.push(tabs[i]);
            }
        }

        if (rest.length > 0) {
            while (visible.length > 0 && used + MORE_BTN_WIDTH > containerWidth) {
                const last = visible[visible.length - 1];
                if (last.value === activeTab) break;
                visible.pop();
                used -= tabWidths[visible.length];
                rest.unshift(last);
            }
        }

        if (activeIncluded && used + MORE_BTN_WIDTH > containerWidth && rest.length > 0) {
            visible.length = 0;
            rest.length = 0;
            visible.push(tabs[activeIdx]);
            for (let i = 0; i < tabs.length; i++) {
                if (i !== activeIdx) rest.push(tabs[i]);
            }
        }

        for (const v of visible) visibleTabs.push(v);
        for (const r of rest) overflowTabs.push(r);
    } else {
        for (const t of tabs) visibleTabs.push(t);
    }

    // ── Handlers ─────────────────────────────────────────────────────────
    const handleTabChange = useCallback(
        (_: React.SyntheticEvent, value: string) => onChange(value),
        [onChange],
    );

    const handleMoreOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
        setMoreAnchorEl(e.currentTarget);
    }, []);

    const handleMoreClose = useCallback(() => setMoreAnchorEl(null), []);

    const handleOverflowSelect = useCallback(
        (value: string) => {
            onChange(value);
            setMoreAnchorEl(null);
        },
        [onChange],
    );

    const tabValue = overflowTabs.some((t) => t.value === activeTab) ? false : activeTab;

    // Stabilise the ref callback so it doesn't recreate on every render.
    const makeRef = useCallback((i: number) => (el: HTMLElement | null) => {
        tabRefs.current[i] = el;
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', overflow: 'hidden', position: 'relative' }}
        >
            {/* Hidden measurement Tabs — renders real <Tab> elements so widths
                match exactly, including icon spacing and MUI padding. */}
            <div
                ref={measureRowRef}
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    maxWidth: 0,
                    overflow: 'hidden',
                }}
            >
                <Tabs value={false} variant="standard" scrollButtons={false}>
                    {tabs.map((t, i) => (
                        <Tab
                            key={t.value}
                            label={t.label}
                            value={t.value}
                            sx={t.sx}
                            {...t.tabProps}
                            ref={makeRef(i)}
                            tabIndex={-1}
                        />
                    ))}
                </Tabs>
            </div>

            {/* Real Tabs + More button */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="standard"
                    scrollButtons={false}
                    sx={{ flex: 1, minWidth: 0 }}
                    {...tabsProps}
                >
                    {visibleTabs.map((t) => (
                        <Tab
                            key={t.value}
                            label={t.label}
                            value={t.value}
                            sx={t.sx}
                            {...t.tabProps}
                        />
                    ))}
                </Tabs>

                {overflowTabs.length > 0 && (
                    <>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        <IconButton
                            onClick={handleMoreOpen}
                            size="small"
                            aria-label="More tabs"
                            sx={{ borderRadius: 1 }}
                        >
                            <MoreVertIcon />
                        </IconButton>
                    </>
                )}
            </div>

            <Menu
                anchorEl={moreAnchorEl}
                open={Boolean(moreAnchorEl)}
                onClose={handleMoreClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                {overflowTabs.map((t) => (
                    <MenuItem
                        key={t.value}
                        onClick={() => handleOverflowSelect(t.value)}
                        selected={t.value === activeTab}
                        sx={t.sx}
                    >
                        <Typography
                            variant="body2"
                            fontWeight={t.value === activeTab ? 700 : 400}
                        >
                            {t.label}
                        </Typography>
                    </MenuItem>
                ))}
            </Menu>
        </div>
    );
}
