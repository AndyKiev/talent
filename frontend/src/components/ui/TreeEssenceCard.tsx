// src/components/ui/TreeEssenceCard.tsx
import { Box, Paper, Typography, Chip } from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useNavigate } from '@tanstack/react-router';
import { useTheme } from '../theme/ThemeContext';
import type { CardEssenceConfig } from '../../types/essence';

interface TreeEssenceCardProps {
    essence: CardEssenceConfig;
}

/** Decorative mini-tree SVG — pure CSS, no deps */
function MiniTree({ color }: { color: string }) {
    return (
        <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* root node */}
            <circle cx="19" cy="5" r="4" fill={color} opacity="0.9" />
            {/* left branch line */}
            <line x1="19" y1="9" x2="9" y2="20" stroke={color} strokeWidth="1.5" opacity="0.5" />
            {/* right branch line */}
            <line x1="19" y1="9" x2="29" y2="20" stroke={color} strokeWidth="1.5" opacity="0.5" />
            {/* left child node */}
            <circle cx="9" cy="23" r="3.5" fill={color} opacity="0.6" />
            {/* right child node */}
            <circle cx="29" cy="23" r="3.5" fill={color} opacity="0.6" />
            {/* left-left grandchild line */}
            <line x1="9" y1="26.5" x2="4" y2="32" stroke={color} strokeWidth="1.2" opacity="0.3" />
            {/* left-right grandchild line */}
            <line x1="9" y1="26.5" x2="14" y2="32" stroke={color} strokeWidth="1.2" opacity="0.3" />
            {/* grandchild dots */}
            <circle cx="4" cy="33" r="2" fill={color} opacity="0.3" />
            <circle cx="14" cy="33" r="2" fill={color} opacity="0.3" />
            <circle cx="29" cy="33" r="2" fill={color} opacity="0.25" />
        </svg>
    );
}

export function TreeEssenceCard({ essence }: TreeEssenceCardProps) {
    const navigate = useNavigate();
    const { t } = useTheme();
    const { Icon, label, description, color, key, parent } = essence;

    return (
        <Paper
            elevation={0}
            onClick={() => navigate({ to: `/${parent}/${key}` })}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2.5,
                borderRadius: '12px',
                border: '2px dashed',
                borderColor: `${color}66`,
                bgcolor: t.cardBg,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                    borderColor: color,
                    borderStyle: 'solid',
                    boxShadow: `0 8px 28px ${color}33`,
                    transform: 'translateY(-2px)',
                    '& .tree-mini': { opacity: 0.18 },
                    '& .tree-arrow': { transform: 'translateX(3px)' },
                },
            }}
        >
            {/* Background decorative tree — top-right corner */}
            <Box
                className="tree-mini"
                sx={{
                    position: 'absolute',
                    right: 12,
                    top: 6,
                    opacity: 0.09,
                    transition: 'opacity 0.2s',
                    pointerEvents: 'none',
                    transform: 'scale(1.6)',
                    transformOrigin: 'top right',
                }}
            >
                <MiniTree color={color} />
            </Box>

            {/* Icon box */}
            <Box
                sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: `${color}18`,
                    border: `1.5px solid ${color}33`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <Icon sx={{ color, fontSize: 24 }} />
            </Box>

            {/* Text */}
            <Box sx={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                    <Typography variant="subtitle1" fontWeight={700} color={t.text}>
                        {label}
                    </Typography>
                    <Chip
                        label="tree"
                        size="small"
                        sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            bgcolor: `${color}18`,
                            color: color,
                            borderRadius: '4px',
                        }}
                    />
                </Box>
                <Typography variant="body2" color={t.textSecondary} noWrap>
                    {description}
                </Typography>
            </Box>

            <ArrowForwardIosIcon
                className="tree-arrow"
                sx={{
                    fontSize: 14,
                    color,
                    flexShrink: 0,
                    transition: 'transform 0.15s',
                    zIndex: 1,
                }}
            />
        </Paper>
    );
}
