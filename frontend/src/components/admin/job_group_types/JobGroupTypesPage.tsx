// src/components/admin/job_group_types/JobGroupTypesPage.tsx
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';
import { JobGroupTypeCrud } from './JobGroupTypeCrud';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';

export function JobGroupTypesPage() {
  const getString = useString();

  return (
    <AppShell>
      <PageContainer>
        <PageBreadcrumbs
          items={[
            { to: '/admin', label: cfl(getString('admin')) },
            { label: cfl(getString('jobGroupTypes')) },
          ]}
        />
        <JobGroupTypeCrud />
      </PageContainer>
    </AppShell>
  );
}
