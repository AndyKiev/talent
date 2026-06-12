import { useEffect } from 'react';
import { Box, useTheme } from '@mui/material';
import {
    WheelColumn,
    ITEM_H,
    PAD,
    type WheelItem,
} from '../personal-data/BirthDateWheelPicker';

// Year-only spin wheel — reuses the WheelColumn from the birth-date picker.
export default function YearWheelPicker({
    value,
    onChange,
    minYear,
    maxYear,
}: {
    value: number | null;
    onChange: (year: number) => void;
    minYear?: number;
    maxYear?: number;
}) {
    const theme = useTheme();
    const hi = maxYear ?? new Date().getFullYear();
    const lo = minYear ?? hi - 70;

    const years: WheelItem[] = [];
    for (let y = lo; y <= hi; y++) years.push({ label: String(y), value: y });

    // Default the wheel to a sensible graduation year when nothing is set yet.
    const current = value ?? hi - 5;

    // Emit the default once so the saved value matches what the wheel shows
    // (otherwise an untouched "Add" would persist null while displaying a year).
    useEffect(() => {
        if (value == null) onChange(current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <Box sx={{ position: 'relative', width: 120, mx: 'auto' }}>
            <WheelColumn ariaLabel="year" items={years} value={current} onChange={onChange} />
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
