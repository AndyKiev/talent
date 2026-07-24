// src/components/developer/DeveloperPage.tsx
import { Box, Typography, Stack } from '@mui/material';
import AppShell from '../layout/AppShell';
import { useTheme } from '../theme/useTheme';
import CodeIcon from '@mui/icons-material/Code';
import { EssenceCard } from '../ui/EssenceCard';
import { GroupEssenceCard } from '../ui/GroupEssenceCard';
import { ESSENCES as RAW_ESSENCES } from './developer.essences.config';
import { useEssences } from '../../hooks/useEssences';
import cfl from '../../utils/helpers.ts';
import useString from '../../hooks/useString';
import str from '../../strings/str';

export function DeveloperPage() {
    const { t } = useTheme();
    const getString = useString({ str });
    const allEssences = useEssences(RAW_ESSENCES);

    const groups       = allEssences.filter((e) => e.isGroup);
    const regularItems = allEssences.filter((e) => !e.isGroup && !e.isTree && !e.parentGroup);

    const getChildCount = (groupKey: string) =>
        allEssences.filter((e) => e.parentGroup === groupKey).length;

    return (
        <AppShell>
            <Box sx={{ minHeight: 'calc(100vh - 56px)', background: t.bg, py: 5, px: 2.5 }}>
                <Box sx={{ maxWidth: 960, mx: 'auto' }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={4}>
                        <CodeIcon sx={{ color: t.accent, fontSize: 28 }} />
                        <Box>
                            <Typography variant="h5" fontWeight={700} letterSpacing="-0.02em" color={t.text}>
                                {cfl(getString('devPanel'))}
                            </Typography>
                        </Box>
                    </Stack>

                    {/* ── Group cards ───────────────────────────────────────── */}
                    {groups.length > 0 && (
                        <Box mb={4}>
                            <Typography variant="subtitle2" color={t.textSecondary} sx={{ mb: 2, ml: 1 }}>
                                {getString('settingsGroups').toUpperCase()}
                            </Typography>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                    gap: 2,
                                }}
                            >
                                {groups.map((group) => (
                                    <GroupEssenceCard
                                        key={group.key}
                                        essence={group}
                                        childCount={getChildCount(group.groupKey || group.key)}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* ── Regular flat cards ────────────────────────────────── */}
                    {regularItems.length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" color={t.textSecondary} sx={{ mb: 2, ml: 1 }}>
                                SETTINGS
                            </Typography>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                    gap: 2,
                                }}
                            >
                                {regularItems.map((essence) => (
                                    <EssenceCard key={essence.key} essence={essence} />
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>
        </AppShell>
    );
}
