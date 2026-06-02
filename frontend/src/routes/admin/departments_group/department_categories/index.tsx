// src/routes/admin/departments_group/department_categories/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentCategoryCrud } from '../../../../components/admin/department_categories/DepartmentCategoryCrud';

export const Route = createFileRoute('/admin/departments_group/department_categories/')({
    component: DepartmentCategoryCrud,
});