// src/components/ui/GroupEssenceCard.tsx
import { Box, Paper, Typography, Chip } from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import FolderIcon from '@mui/icons-material/Folder';
import { useNavigate } from '@tanstack/react-router';
import { useTheme } from '../theme/ThemeContext';
import type { CardEssenceConfig } from '../../types/essence';
import cfl from "../../utils/helpers.ts";

interface GroupEssenceCardProps {
    essence: CardEssenceConfig;
    childCount: number;
}

export function GroupEssenceCard({ essence, childCount }: GroupEssenceCardProps) {
    const navigate = useNavigate();
    const { t } = useTheme();
    const { Icon, label, description, color, key, parent } = essence;

    return (
        <Paper
            elevation={0}
            onClick={async () => await navigate({ to: `/${parent}/${key}` })}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2.5,
                borderRadius: '12px',
                border: '2px solid',
                borderColor: color,
                background: `linear-gradient(135deg, ${color}08 0%, transparent 100%)`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                '&:hover': {
                    borderColor: color,
                    boxShadow: `0 8px 24px ${color}44`,
                    transform: 'translateY(-2px)',
                },
            }}
        >
            <Box
                sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: `${color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <Icon sx={{ color, fontSize: 24 }} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} color={t.text}>
                        {cfl(label)}
                    </Typography>
                    <Chip
                        label={`${childCount} item${childCount !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: `${color}20`,
                            color: color,
                            fontWeight: 600
                        }}
                    />
                </Box>
                <Typography variant="body2" color={t.textSecondary}>
                    {description}
                </Typography>
            </Box>

            <FolderIcon sx={{ fontSize: 18, color: color, flexShrink: 0 }} />
            <ArrowForwardIosIcon sx={{ fontSize: 14, color: color, flexShrink: 0, ml: 0.5 }} />
        </Paper>
    );
}