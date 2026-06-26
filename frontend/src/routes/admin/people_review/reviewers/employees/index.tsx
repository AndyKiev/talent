// src/routes/admin/people_review/reviewers/employees/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ProcessRoleHolderEmployeeLinkCrud } from '../../../../../components/admin/reviewers/process_role_holder_employee_link/ProcessRoleHolderEmployeeLinkCrud';

export const Route = createFileRoute('/admin/people_review/reviewers/employees/')({
    component: ProcessRoleHolderEmployeeLinkCrud,
});
