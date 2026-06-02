// src/components/admin/jobs/JobsGroupPage.tsx
import { useState } from 'react';
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import { JobCrud } from './JobCrud';
import { JobGroupCrud } from '../job_groups/JobGroupCrud';
import { JobGroupTypeCrud } from '../job_group_types/JobGroupTypeCrud';
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

export function JobsGroupPage() {
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
                        {cfl(getString('jobs') || 'Jobs')}
                    </Typography>
                </Breadcrumbs>

                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label={cfl(getString('jobs') || 'Jobs')} />
                    <Tab label={cfl(getString('jobGroups') || 'Job Groups')} />
                    <Tab label={cfl(getString('jobGroupTypes') || 'Job Group Types')} />
                </Tabs>

                <TabPanel value={tab} index={0}><JobCrud /></TabPanel>
                <TabPanel value={tab} index={1}><JobGroupCrud /></TabPanel>
                <TabPanel value={tab} index={2}><JobGroupTypeCrud /></TabPanel>
            </Box>
        </AppShell>
    );
}