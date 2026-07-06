import { useEffect, useRef } from 'react';
import { Box, useTheme } from '@mui/material';
import dayjs from 'dayjs';

// iOS-style 3-wheel (year / month / day) scroll picker. No external dependency:
// CSS scroll-snap does the snapping, we read the centered item once scrolling
// settles. Value is carried as an ISO 'YYYY-MM-DD' string; display elsewhere is
// DD.MM.YYYY (this widget shows numeric month/day so it stays locale-free).

export const ITEM_H = 36;          // px per row
const VISIBLE = 5;          // rows shown (odd, so one is centered)
export const PAD = ((VISIBLE - 1) / 2) * ITEM_H;

export interface WheelItem {
    label: string;
    value: number;
}

// Single spin-wheel column. Exported so other pickers (e.g. a year-only picker)
// can reuse it without duplicating the scroll-snap logic.
export function WheelColumn({
    items,
    value,
    onChange,
    ariaLabel,
}: {
    items: WheelItem[];
    value: number;
    onChange: (v: number) => void;
    ariaLabel: string;
}) {
    const theme = useTheme();
    const ref = useRef<HTMLDivElement>(null);
    const settleTimer = useRef<number | undefined>(undefined);
    const userScrolling = useRef(false);

    const idx = Math.max(0, items.findIndex((i) => i.value === value));

    // Keep the scroll position in sync when the value changes externally
    // (e.g. day clamped after month change). Skip while the user is scrolling
    // so we never fight their gesture.
    useEffect(() => {
        const el = ref.current;
        if (!el || userScrolling.current) return;
        const target = idx * ITEM_H;
        if (Math.abs(el.scrollTop - target) > 1) {
            el.scrollTo({ top: target });
        }
    }, [idx]);

    const handleScroll = () => {
        userScrolling.current = true;
        window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(() => {
            const el = ref.current;
            userScrolling.current = false;
            if (!el) return;
            const i = Math.round(el.scrollTop / ITEM_H);
            const clamped = Math.min(items.length - 1, Math.max(0, i));
            const v = items[clamped]?.value;
            if (v !== undefined && v !== value) onChange(v);
        }, 110);
    };

    return (
        <Box
            ref={ref}
            role="listbox"
            aria-label={ariaLabel}
            onScroll={handleScroll}
            sx={{
                position: 'relative',
                height: VISIBLE * ITEM_H,
                overflowY: 'auto',
                flex: 1,
                scrollSnapType: 'y mandatory',
                py: `${PAD}px`,
                textAlign: 'center',
                // hide scrollbar
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
            }}
        >
            {items.map((item) => {
                const selected = item.value === value;
                return (
                    <Box
                        key={item.value}
                        onClick={() => onChange(item.value)}
                        sx={{
                            height: ITEM_H,
                            lineHeight: `${ITEM_H}px`,
                            scrollSnapAlign: 'center',
                            cursor: 'pointer',
                            fontSize: selected ? 19 : 16,
                            fontWeight: selected ? 700 : 400,
                            color: selected ? theme.palette.text.primary : theme.palette.text.disabled,
                            transition: 'font-size .12s, color .12s',
                            userSelect: 'none',
                        }}
                    >
                        {item.label}
                    </Box>
                );
            })}
        </Box>
    );
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function BirthDateWheelPicker({
    value,
    onChange,
    minYear,
    maxYear,
}: {
    value: string | null;            // ISO 'YYYY-MM-DD' or null
    onChange: (iso: string) => void;
    minYear?: number;
    maxYear?: number;
}) {
    const theme = useTheme();
    const today = dayjs();
    const hiYear = maxYear ?? today.year();
    const loYear = minYear ?? hiYear - 100;

    // Parse the current value, defaulting to a sensible birth-year if empty.
    const base = value ? dayjs(value) : dayjs(`${hiYear - 30}-01-01`);
    const year = base.year();
    const month = base.month() + 1;     // 1..12
    const day = base.date();            // 1..31

    const years: WheelItem[] = [];
    for (let y = loYear; y <= hiYear; y++) years.push({ label: String(y), value: y });
    const months: WheelItem[] = [];
    for (let m = 1; m <= 12; m++) months.push({ label: pad2(m), value: m });
    const daysInMonth = dayjs(`${year}-${pad2(month)}-01`).daysInMonth();
    const days: WheelItem[] = [];
    for (let d = 1; d <= daysInMonth; d++) days.push({ label: pad2(d), value: d });

    const emit = (y: number, m: number, d: number) => {
        const dim = dayjs(`${y}-${pad2(m)}-01`).daysInMonth();
        const safeDay = Math.min(d, dim);          // clamp e.g. 31 -> 30/28
        onChange(`${y}-${pad2(m)}-${pad2(safeDay)}`);
    };

    // Emit the default once so the saved value matches what the wheel shows
    // (otherwise an untouched picker would persist null while displaying a date).
    useEffect(() => {
        if (!value) emit(year, month, day);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <Box sx={{ position: 'relative', width: '100%', maxWidth: 320, mx: 'auto' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <WheelColumn ariaLabel="year" items={years} value={year} onChange={(y) => emit(y, month, day)} />
                <WheelColumn ariaLabel="month" items={months} value={month} onChange={(m) => emit(year, m, day)} />
                <WheelColumn ariaLabel="day" items={days} value={day} onChange={(d) => emit(year, month, d)} />
            </Box>
            {/* Center highlight band */}
            <Box
                sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: PAD,
                    height: ITEM_H,
                    pointerEvents: 'none',
                    borderTop: `1px solid ${theme.palette.divider}`,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    bgcolor: `${theme.palette.primary.main}0F`,
                    borderRadius: 1,
                }}
            />
        </Box>
    );
}
