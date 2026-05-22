// src/components/developer/DeveloperPage.tsx
import { Box, Typography, Stack } from '@mui/material';
import AppShell from '../layout/AppShell';
import { useTheme } from '../theme/ThemeContext';
import CodeIcon from '@mui/icons-material/Code';
import { EssenceCard } from '../ui/EssenceCard';
import { ESSENCES as RAW_ESSENCES } from './developer.essences.config';
import { useEssences } from '../../hooks/useEssences';
import cfl from '../../utils/capitalizeFirstLetter';
import useString from '../../hooks/useString';
import str from '../../strings/str';

export function DeveloperPage() {
    const { t } = useTheme();
    const getString = useString({ str });
    const essences = useEssences(RAW_ESSENCES);

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

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: 2,
                        }}
                    >
                        {essences.map((essence) => (
                            <EssenceCard key={essence.key} essence={essence} />
                        ))}
                    </Box>
                </Box>
            </Box>
        </AppShell>
    );
}