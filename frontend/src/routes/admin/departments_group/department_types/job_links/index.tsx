// src/routes/admin/departments_group/department_types/job_links/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentTypeJobLinkPanel } from '../../../../../components/admin/department_types/DepartmentTypeJobLinkPanel';

export const Route = createFileRoute('/admin/departments_group/department_types/job_links/')({
    component: DepartmentTypeJobLinkPanel,
});
