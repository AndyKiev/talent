// src/components/admin/employee_event_types/EmployeeEventTypesPage.tsx
import AppShell from '../../../layout/AppShell.tsx';
import { PageContainer } from '../../../layout/PageContainer';
import { PageBreadcrumbs } from '../../../ui/PageBreadcrumbs';
import { EmployeeEventTypeCrud } from './EmployeeEventTypeCrud.tsx';
import cfl from '../../../../utils/helpers.ts';
import useString from '../../../../hooks/useString.ts';

export function EmployeeEventTypePage() {
    const getString = useString();
    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/admin', label: cfl(getString('admin')) },
                        { to: '/admin/employee_events', label: cfl(getString('employeeEvents')) },
                        { label: cfl(getString('employeeEventTypes')) },
                    ]}
                />

                <EmployeeEventTypeCrud />
            </PageContainer>
        </AppShell>
    );
}
