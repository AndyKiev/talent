// src/components/user_settings/UserSettingsPage.tsx
//
// User settings LANDING: a grid of group cards, mirroring the developer page.
// The /user_settings/effective payload already contains ONLY the settings this
// user may override, so a group card shows iff at least one returned setting
// maps to it. Clicking a card opens /settings/$groupKey (UserSettingsGroupView).
import { useMemo } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import AppShell from '../layout/AppShell';
import { PageContainer } from '../layout/PageContainer';
import useString from '../../hooks/useString';
import { USER_SETTINGS_EFFECTIVE_QK } from '../../utils/queryKeys';
import { fetchEffectiveUserSettings } from './userSettingsApi';
import cfl from '../../utils/helpers.ts';
import { SETTINGS_GROUPS, groupForKey } from '../developer/settings/settingsGroups';
import { SettingsGroupCard } from '../developer/settings/SettingsGroupCard';
import { PageBreadcrumbs } from '../ui/PageBreadcrumbs';

export function UserSettingsPage() {
    const getString = useString();

    const { data: settings = [], isLoading } = useQuery({
        queryKey: USER_SETTINGS_EFFECTIVE_QK,
        queryFn: fetchEffectiveUserSettings,
        staleTime: 60_000,
    });

    // Count overridable settings per group so empty groups get no card.
    const countByGroup = useMemo(() => {
        const counts = new Map<string, number>();
        for (const s of settings) {
            const g = groupForKey(s.key);
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
                        { to: '/', label: cfl(getString('home') || 'Home') },
                        { label: getString('mySettings') },
                    ]}
                />

                <Typography variant="h6" fontWeight={700} mb={2}>{getString('mySettings')}</Typography>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : visibleGroups.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        {getString('noUserSettings')}
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
                                basePath="/settings"
                                count={countByGroup.get(g.key)}
                            />
                        ))}
                    </Box>
                )}
            </PageContainer>
        </AppShell>
    );
}
