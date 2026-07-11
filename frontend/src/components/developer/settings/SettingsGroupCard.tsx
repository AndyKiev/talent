// src/components/developer/settings/SettingsGroupCard.tsx
//
// One clickable settings-group card, styled after components/ui/EssenceCard.
// Navigates to the group's own route (dev or user side). Shown on the settings
// landing grids in place of the old flat list.
import { Box, Paper, Typography } from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useNavigate } from '@tanstack/react-router';
import { useTheme } from '../../theme/ThemeContext';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/capitalizeFirstLetter';
import type { SettingsGroup } from './settingsGroups';

interface Props {
    group: SettingsGroup;
    // Where clicking lands: the group route base (e.g. '/developer/settings' or
    // '/settings'); the group key is appended.
    basePath: string;
    // Optional count of settings in this group (shown as a subtitle hint).
    count?: number;
}

export function SettingsGroupCard({ group, basePath, count }: Props) {
    const navigate = useNavigate();
    const { t } = useTheme();
    const getString = useString();
    const { Icon, color, key, labelKey, descriptionKey } = group;

    return (
        <Paper
            elevation={0}
            onClick={() => navigate({ to: `${basePath}/${key}` })}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2.5,
                borderRadius: '10px',
                border: '1px solid',
                borderColor: t.border,
                bgcolor: t.cardBg,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                    borderColor: color,
                    boxShadow: `0 4px 20px ${color}22`,
                    transform: 'translateY(-1px)',
                },
            }}
        >
            <Box
                sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '8px',
                    background: `${color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <Icon sx={{ color, fontSize: 22 }} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={600} color={t.text}>
                    {cfl(getString(labelKey))}
                    {typeof count === 'number' ? ` (${count})` : ''}
                </Typography>
                <Typography variant="caption" color={t.textSecondary}>
                    {getString(descriptionKey)}
                </Typography>
            </Box>

            <ArrowForwardIosIcon sx={{ fontSize: 14, color: t.disabledText, flexShrink: 0 }} />
        </Paper>
    );
}
