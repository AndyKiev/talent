// src/components/admin/job_groups/JobGroupsPage.tsx
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';
import { JobGroupCrud } from './JobGroupCrud';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';

export function JobGroupsPage() {
  const getString = useString();

  return (
    <AppShell>
      <PageContainer>
        <PageBreadcrumbs
          items={[
            { to: '/admin', label: cfl(getString('admin')) },
            { label: cfl(getString('jobGroups')) },
          ]}
        />
        <JobGroupCrud />
      </PageContainer>
    </AppShell>
  );
}
