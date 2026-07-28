// src/components/admin/department_types/DepartmentTypesPage.tsx
import { useState } from 'react';
import AppShell from '../../layout/AppShell.tsx';
import { PageContainer } from '../../layout/PageContainer';
import { Tab, Tabs } from '@mui/material';
import { DepartmentTypeCrud } from './DepartmentTypeCrud.tsx';
import { DepartmentTypeHierarchy } from './DepartmentTypeHierarchy.tsx';
import { DepartmentTypeJobLinkPanel } from './DepartmentTypeJobLinkPanel.tsx';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString.ts';

export function DepartmentTypesPage() {
    const getString = useString();
    const [tab, setTab] = useState(0);

    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/admin', label: cfl(getString('admin')) },
                        { label: cfl(getString('departmentTypes')) },
                    ]}
                />

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
            </PageContainer>
        </AppShell>
    );
}
