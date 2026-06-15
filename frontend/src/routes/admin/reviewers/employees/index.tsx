// src/routes/admin/reviewers/employees/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ProcessRoleHolderEmployeeLinkCrud } from '../../../../components/admin/reviewers/process_role_holder_employee_link/ProcessRoleHolderEmployeeLinkCrud';

export const Route = createFileRoute('/admin/reviewers/employees/')({
    component: ProcessRoleHolderEmployeeLinkCrud,
});
