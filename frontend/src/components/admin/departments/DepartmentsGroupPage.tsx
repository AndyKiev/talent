// src/components/admin/departments/DepartmentsGroupPage.tsx
import React, { useState } from 'react';
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import { DepartmentTree } from './DepartmentTree';
import { DepartmentCategoryCrud } from '../department_categories/DepartmentCategoryCrud';
import { DepartmentTypeCrud } from '../department_types/DepartmentTypeCrud';
import { DepartmentTypeHierarchy } from '../department_types/DepartmentTypeHierarchy';
import { DepartmentTypeJobLinkPanel } from '../department_types/DepartmentTypeJobLinkPanel';
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

export function DepartmentsGroupPage() {
    const getString = useString({ str });
    const [tab, setTab] = useState(0);
    const [deptTypeTab, setDeptTypeTab] = useState(0);

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('admin'))}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('departments') || 'Departments')}
                    </Typography>
                </Breadcrumbs>

                {/* Top-level tabs: Structure / Categories / Types */}
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label={cfl(getString('structure') || 'Structure')} />
                    <Tab label={cfl(getString('departmentCategories') || 'Categories')} />
                    <Tab label={cfl(getString('departmentTypes') || 'Types')} />
                </Tabs>

                <TabPanel value={tab} index={0}>
                    <DepartmentTree selectedId={null} />
                </TabPanel>

                <TabPanel value={tab} index={1}>
                    <DepartmentCategoryCrud />
                </TabPanel>

                {/* Department Types has its own sub-tabs */}
                <TabPanel value={tab} index={2}>
                    <Tabs
                        value={deptTypeTab}
                        onChange={(_, v) => setDeptTypeTab(v)}
                        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab label={cfl(getString('list') || 'List')} />
                        <Tab label={cfl(getString('hierarchy') || 'Hierarchy')} />
                        <Tab label={cfl(getString('jobLinks') || 'Job Links')} />
                    </Tabs>
                    {deptTypeTab === 0 && <DepartmentTypeCrud />}
                    {deptTypeTab === 1 && <DepartmentTypeHierarchy />}
                    {deptTypeTab === 2 && <DepartmentTypeJobLinkPanel />}
                </TabPanel>
            </Box>
        </AppShell>
    );
}