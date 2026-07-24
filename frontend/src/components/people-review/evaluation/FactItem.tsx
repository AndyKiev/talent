import type { ReactNode } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import { useTheme } from '../../theme/useTheme';

interface Props {
    icon: ReactNode;
    label: string;
    value: ReactNode;
    /** When provided, an inline edit pencil is shown next to the value. */
    onEdit?: () => void;
    editTitle?: string;
}

/** One labelled fact: icon + caption + value, with an optional inline edit pencil. */
export function FactItem({ icon, label, value, onEdit, editTitle }: Props) {
    const { t } = useTheme();
    return (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            {icon}
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color={t.textMuted} sx={{ display: 'block', lineHeight: 1.1 }}>
                    {label}
                </Typography>
                <Stack direction="row" spacing={0.25} alignItems="center">
                    <Typography variant="body2" color={t.text} fontWeight={600} noWrap>
                        {value}
                    </Typography>
                    {onEdit && (
                        <Tooltip title={editTitle ?? ''} placement="top">
                            <IconButton size="small" onClick={onEdit} sx={{ p: 0.2 }}>
                                <EditCalendarIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            </Box>
        </Stack>
    );
}
