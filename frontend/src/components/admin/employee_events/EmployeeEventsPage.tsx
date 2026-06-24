// src/components/admin/employee_events/EmployeeEventsPage.tsx
import React, { useState } from 'react';
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import { EmployeeEventTypeCrud } from './employee_event_types/EmployeeEventTypeCrud';
import { EmployeeEventDirectionTypeCrud } from './employee_event_direction_types/EmployeeEventDirectionTypeCrud';
import { EmployeeEventStatusCrud } from './employee_event_statuses/EmployeeEventStatusCrud';
import { EmployeeEventChangeDeptTypeCrud } from './employee_event_change_dept_types/EmployeeEventChangeDeptTypeCrud';
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

export function EmployeeEventsPage() {
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
                        {cfl(getString('employeeEvents') || 'Employee Events')}
                    </Typography>
                </Breadcrumbs>

                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label={cfl(getString('employeeEventTypes') || 'Event Types')} />
                    <Tab label={cfl(getString('employeeEventDirectionTypes') || 'Direction Types')} />
                    <Tab label={cfl(getString('employeeEventStatuses') || 'Statuses')} />
                    <Tab label={cfl(getString('employeeEventChangeDeptTypes') || 'Change Dept Types')} />
                </Tabs>

                <TabPanel value={tab} index={0}><EmployeeEventTypeCrud /></TabPanel>
                <TabPanel value={tab} index={1}><EmployeeEventDirectionTypeCrud /></TabPanel>
                <TabPanel value={tab} index={2}><EmployeeEventStatusCrud /></TabPanel>
                <TabPanel value={tab} index={3}><EmployeeEventChangeDeptTypeCrud /></TabPanel>
            </Box>
        </AppShell>
    );
}