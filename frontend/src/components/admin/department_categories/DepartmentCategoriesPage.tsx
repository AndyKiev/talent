// src/components/admin/department_categories/DepartmentCategoriesPage.tsx
import AppShell from '../../layout/AppShell.tsx';
import { PageContainer } from '../../layout/PageContainer';
import { DepartmentCategoryCrud } from './DepartmentCategoryCrud.tsx';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString.ts';

export function DepartmentCategoriesPage() {
    const getString = useString();
    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/admin', label: cfl(getString('admin')) },
                        { label: cfl(getString('departmentCategories')) },
                    ]}
                />

                <DepartmentCategoryCrud />
            </PageContainer>
        </AppShell>
    );
}
