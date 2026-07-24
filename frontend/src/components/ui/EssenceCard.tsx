// src/components/ui/EssenceCard.tsx
import { Box, Paper, Typography } from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useNavigate } from '@tanstack/react-router';
import { useTheme } from '../theme/useTheme';
import type { CardEssenceConfig } from '../../types/essence';

interface EssenceCardProps {
    essence: CardEssenceConfig;
    isChild?: boolean;
}

export function EssenceCard({ essence, isChild = false }: EssenceCardProps) {
    const navigate = useNavigate();
    const { t } = useTheme();
    const { Icon, label, description, color, key, parent, parentGroup } = essence;

    const handleClick = async () => {
        if (parentGroup) {
            await navigate({ to: `/${parent}/${parentGroup}/${key}` });
        } else {
            await navigate({ to: `/${parent}/${key}` });
        }
    };

    return (
        <Paper
            elevation={0}
            onClick={handleClick}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: isChild ? 2 : 2.5,
                pl: isChild ? 3 : 2.5,
                borderRadius: '10px',
                border: '1px solid',
                borderColor: t.border,
                bgcolor: t.cardBg,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                ml: isChild ? 2 : 0,
                '&:hover': {
                    borderColor: color,
                    boxShadow: `0 4px 20px ${color}22`,
                    transform: 'translateY(-1px)',
                },
            }}
        >
            <Box
                sx={{
                    width: isChild ? 36 : 44,
                    height: isChild ? 36 : 44,
                    borderRadius: '8px',
                    background: `${color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <Icon sx={{ color, fontSize: isChild ? 18 : 22 }} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant={isChild ? "body2" : "subtitle2"} fontWeight={600} color={t.text}>
                    {label}
                </Typography>
                <Typography variant="caption" color={t.textSecondary}>
                    {description}
                </Typography>
            </Box>

            <ArrowForwardIosIcon sx={{ fontSize: 14, color: t.disabledText, flexShrink: 0 }} />
        </Paper>
    );
}