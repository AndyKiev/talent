// src/components/admin/department_types/DepartmentTypesPage.tsx
import { useState } from 'react';
import AppShell from '../../layout/AppShell.tsx';
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { DepartmentTypeCrud } from './DepartmentTypeCrud.tsx';
import { DepartmentTypeHierarchy } from './DepartmentTypeHierarchy.tsx';
import { DepartmentTypeJobLinkPanel } from './DepartmentTypeJobLinkPanel.tsx';

import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString.ts';
import str from '../../../strings/str.ts';

export function DepartmentTypesPage() {
    const getString = useString({ str });
    const [tab, setTab] = useState(0);

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1100, mx: 'auto' }}>
                <Breadcrumbs
                    separator={<NavigateNextIcon fontSize="small" />}
                    sx={{ mb: 3 }}
                >
                    <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('admin'))}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('departmentTypes'))}
                    </Typography>
                </Breadcrumbs>

                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label={cfl(getString('list') || 'List')} />
                    <Tab label={cfl(getString('hierarchy') || 'Hierarchy')} />
                    <Tab label={cfl(getString('jobLinks') || 'Job Links')} />
                </Tabs>

                {tab === 0 && <DepartmentTypeCrud />}
                {tab === 1 && <DepartmentTypeHierarchy />}
                {tab === 2 && <DepartmentTypeJobLinkPanel />}
            </Box>
        </AppShell>
    );
}
