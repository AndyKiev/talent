// src/components/developer/settings/SettingsPage.tsx
//
// Developer settings LANDING: a grid of group cards (mirrors the admin
// dashboard). Only groups that actually hold at least one setting are shown.
// Clicking a card opens /developer/settings/$groupKey (SettingsGroupView),
// where the settings render exactly as the old flat list did.
import { useMemo } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/capitalizeFirstLetter';
import { APP_SETTINGS_QK } from '../../../utils/queryKeys';
import { fetchAppSettings } from './settingsApi';
import { SETTINGS_GROUPS, groupForSetting } from './settingsGroups';
import { SettingsGroupCard } from './SettingsGroupCard';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

export function SettingsPage() {
    const getString = useString();

    const { data: settings = [], isLoading } = useQuery({
        queryKey: APP_SETTINGS_QK,
        queryFn: fetchAppSettings,
        staleTime: 60_000,
    });

    // Count settings per group (children counted under their parent's group) so
    // empty groups get no card and each card can show its size.
    const countByGroup = useMemo(() => {
        const byId = new Map(settings.map((s) => [s.id, s]));
        const counts = new Map<string, number>();
        for (const s of settings) {
            const g = groupForSetting(s, byId);
            counts.set(g, (counts.get(g) ?? 0) + 1);
        }
        return counts;
    }, [settings]);

    const visibleGroups = SETTINGS_GROUPS.filter((g) => (countByGroup.get(g.key) ?? 0) > 0);

    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/developer', label: cfl(getString('devPanel')) },
                        { label: cfl(getString('settings')) },
                    ]}
                />

                <Typography variant="h6" fontWeight={700} mb={2}>{cfl(getString('settings'))}</Typography>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : visibleGroups.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        {getString('noSettings')}
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: 2,
                        }}
                    >
                        {visibleGroups.map((g) => (
                            <SettingsGroupCard
                                key={g.key}
                                group={g}
                                basePath="/developer/settings"
                                count={countByGroup.get(g.key)}
                            />
                        ))}
                    </Box>
                )}
            </PageContainer>
        </AppShell>
    );
}
