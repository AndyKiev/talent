// src/components/admin/departments/StructurePage.tsx
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';
import { DepartmentTree } from './DepartmentTree';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';

export function StructurePage() {
  const getString = useString();

  return (
    <AppShell>
      <PageContainer>
        <PageBreadcrumbs
          items={[
            { to: '/admin', label: cfl(getString('admin') || 'Admin') },
            { label: cfl(getString('structure') || 'Structure') },
          ]}
        />

        <DepartmentTree selectedId={null} />
      </PageContainer>
    </AppShell>
  );
}
