// src/components/admin/departments/DepartmentDetailPage.tsx
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';
import { DepartmentTree } from './DepartmentTree';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';

interface Props {
    departmentId: number;
}

export function DepartmentDetailPage({ departmentId }: Props) {
    const getString = useString();

    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/admin', label: cfl(getString('admin') || 'Admin') },
                        { to: '/admin/structure', label: cfl(getString('structure') || 'Structure') },
                        { label: `#${departmentId}` },
                    ]}
                />

                <DepartmentTree selectedId={departmentId} />
            </PageContainer>
        </AppShell>
    );
}
