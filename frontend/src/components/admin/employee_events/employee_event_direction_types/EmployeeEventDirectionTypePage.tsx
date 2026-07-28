// src/components/admin/employee_events/employee_event_direction_types/EmployeeEventDirectionTypePage.tsx
import AppShell from '../../../layout/AppShell.tsx';
import { PageContainer } from '../../../layout/PageContainer';
import { PageBreadcrumbs } from '../../../ui/PageBreadcrumbs';
import { EmployeeEventDirectionTypeCrud } from './EmployeeEventDirectionTypeCrud.tsx';
import cfl from '../../../../utils/helpers.ts';
import useString from '../../../../hooks/useString.ts';

export function EmployeeEventDirectionTypePage() {
    const getString = useString();
    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/admin', label: cfl(getString('admin')) },
                        { to: '/admin/employee_events', label: cfl(getString('employeeEvents')) },
                        { label: cfl(getString('employeeEventDirectionTypes')) },
                    ]}
                />

                <EmployeeEventDirectionTypeCrud />
            </PageContainer>
        </AppShell>
    );
}
