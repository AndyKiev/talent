// src/components/admin/persons/PersonsPage.tsx
import AppShell from '../../layout/AppShell.tsx';
import { PageContainer } from '../../layout/PageContainer';
import { PersonCrud } from './PersonCrud.tsx';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString.ts';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

export function PersonsPage() {
    const getString = useString();
    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/admin', label: cfl(getString('admin')) },
                        { label: cfl(getString('persons')) },
                    ]}
                />

                <PersonCrud />
            </PageContainer>
        </AppShell>
    );
}
