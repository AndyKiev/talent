import { Box, useTheme } from '@mui/material';
import {
    WheelColumn,
    ITEM_H,
    PAD,
    type WheelItem,
} from '../people-review/personal-data/DateWheelPicker';

/**
 * Duration-in-months spin wheel for the mission form.
 *
 * Reuses WheelColumn from the birth-date picker (imported, never copied — see
 * the /wheel-picker skill). The upper bound comes from the app setting
 * `mission_max_duration_months` (36); the backend re-validates it, so this is a
 * convenience cap, not the rule.
 */
export default function MissionDurationWheel({
    value,
    onChange,
    maxMonths,
}: {
    value: number;
    onChange: (months: number) => void;
    maxMonths: number;
}) {
    const theme = useTheme();

    const months: WheelItem[] = [];
    for (let m = 1; m <= Math.max(1, maxMonths); m++) {
        months.push({ label: String(m), value: m });
    }

    return (
        <Box sx={{ position: 'relative', width: 96, mx: 'auto' }}>
            <WheelColumn
                ariaLabel="duration_months"
                items={months}
                value={value}
                onChange={onChange}
            />
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
