// src/components/admin/jobs/JobsPage.tsx
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { JobCrud } from './JobCrud';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import {setPageTitle} from "../../../utils/setPageTitle.ts";
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

export function JobsPage() {
  const getString = useString();
  setPageTitle(getString('jobs') || 'Jobs');

  return (
    <AppShell>
      <PageContainer>
        <PageBreadcrumbs
          items={[
            { to: '/admin', label: cfl(getString('admin')) },
            { label: cfl(getString('jobs')) },
          ]}
        />
        <JobCrud />
      </PageContainer>
    </AppShell>
  );
}
