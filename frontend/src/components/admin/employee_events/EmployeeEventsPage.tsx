// src/components/admin/employee_events/EmployeeEventsPage.tsx
import { useTheme } from '../../theme/ThemeContext';
import AppShell from '../../layout/AppShell';
import { Box, Typography, Stack, IconButton } from '@mui/material';
import { EventNote, ArrowBack } from '@mui/icons-material';
import { ESSENCES as RAW_ESSENCES } from '../admin.essences.config';
import { EssenceCard } from '../../ui/EssenceCard';
import { useEssences } from '../../../hooks/useEssences';
import { useNavigate } from '@tanstack/react-router';
import cfl from '../../../utils/capitalizeFirstLetter';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

export function EmployeeEventsPage() {
    const { t } = useTheme();
    const navigate = useNavigate();
    const getString = useString({ str });

    // Get all essences and filter for those belonging to employee_events group
    const allEssences = useEssences(RAW_ESSENCES);
    const childEssences = allEssences.filter(essence => essence.parentGroup === 'employee_events');

    return (
        <AppShell>
            <Box sx={{ minHeight: 'calc(100vh - 56px)', background: t.bg, py: 5, px: 2.5 }}>
                <Box sx={{ maxWidth: 960, mx: 'auto' }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={4}>
                        <IconButton
                            onClick={() => navigate({ to: '/admin' })}
                            sx={{ color: t.textSecondary }}
                        >
                            <ArrowBack />
                        </IconButton>
                        <EventNote sx={{ color: '#8b5cf6', fontSize: 28 }} />
                        <Box>
                            <Typography variant="h5" fontWeight={700} letterSpacing="-0.02em" color={t.text}>
                                {cfl(getString('employeeEvents'))}
                            </Typography>
                            <Typography variant="body2" color={t.textSecondary}>
                                {cfl(getString('employeeEventsDesc'))}
                            </Typography>
                        </Box>
                    </Stack>

                    {childEssences.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <Typography variant="body1" color={t.textSecondary}>
                                No settings available for employee events yet.
                            </Typography>
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: 2,
                            }}
                        >
                            {childEssences.map((essence) => (
                                <EssenceCard key={essence.key} essence={essence} isChild={true} />
                            ))}
                        </Box>
                    )}
                </Box>
            </Box>
        </AppShell>
    );
}