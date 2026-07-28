// src/components/admin/employee_events/EmployeeEventsPage.tsx
import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';
import { EmployeeEventTypeCrud } from './employee_event_types/EmployeeEventTypeCrud';
import { EmployeeEventDirectionTypeCrud } from './employee_event_direction_types/EmployeeEventDirectionTypeCrud';
import { EmployeeEventStatusCrud } from './employee_event_statuses/EmployeeEventStatusCrud';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
    return (
        <Box hidden={value !== index} sx={{ pt: 3 }}>
            {value === index && children}
        </Box>
    );
}

export function EmployeeEventsPage() {
    const getString = useString();
    const [tab, setTab] = useState(0);

    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/admin', label: cfl(getString('admin')) },
                        { label: cfl(getString('employeeEvents') || 'Employee Events') },
                    ]}
                />

                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label={cfl(getString('employeeEventTypes') || 'Event Types')} />
                    <Tab label={cfl(getString('employeeEventDirectionTypes') || 'Direction Types')} />
                    <Tab label={cfl(getString('employeeEventStatuses') || 'Statuses')} />
                </Tabs>

                <TabPanel value={tab} index={0}><EmployeeEventTypeCrud /></TabPanel>
                <TabPanel value={tab} index={1}><EmployeeEventDirectionTypeCrud /></TabPanel>
                <TabPanel value={tab} index={2}><EmployeeEventStatusCrud /></TabPanel>
            </PageContainer>
        </AppShell>
    );
}
