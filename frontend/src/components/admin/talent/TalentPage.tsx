// src/components/admin/talent/TalentPage.tsx
import { useState } from 'react';
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import { TalentStatusPeriodLinkCrud } from '../talent-status-period-links/TalentStatusPeriodLinkCrud';
import { TalentPeriodCrud } from '../talent-periods/TalentPeriodCrud';
import { TalentStatusCrud } from '../talent-statuses/TalentStatusCrud';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
    return (
        <Box hidden={value !== index} sx={{ pt: 3 }}>
            {value === index && children}
        </Box>
    );
}

export function TalentPage() {
    const getString = useString({ str });
    const [tab, setTab] = useState(0);

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1800, mx: 'auto' }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('admin'))}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('talent') || 'Talent')}
                    </Typography>
                </Breadcrumbs>

                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label={cfl(getString('talentStatusPeriodLinks') || 'Status–Period Links')} />
                    <Tab label={cfl(getString('talentPeriods') || 'Periods')} />
                    <Tab label={cfl(getString('talentStatuses') || 'Statuses')} />
                </Tabs>

                <TabPanel value={tab} index={0}>
                    <TalentStatusPeriodLinkCrud />
                </TabPanel>
                <TabPanel value={tab} index={1}>
                    <TalentPeriodCrud />
                </TabPanel>
                <TabPanel value={tab} index={2}>
                    <TalentStatusCrud />
                </TabPanel>
            </Box>
        </AppShell>
    );
}