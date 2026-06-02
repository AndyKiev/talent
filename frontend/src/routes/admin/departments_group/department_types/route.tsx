// src/routes/admin/departments_group/department_types/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentTypesLayout } from '../../../../components/admin/department_types/DepartmentTypesLayout';

export const Route = createFileRoute('/admin/departments_group/department_types')({
    component: DepartmentTypesLayout,
});
