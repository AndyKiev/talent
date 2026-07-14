// src/routes/admin/departments_group/department_types/job_links_board/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentTypeJobLinkBoard } from '../../../../../components/admin/department_types/DepartmentTypeJobLinkBoard';

export const Route = createFileRoute(
    '/admin/departments_group/department_types/job_links_board/',
)({
    component: DepartmentTypeJobLinkBoard,
});
