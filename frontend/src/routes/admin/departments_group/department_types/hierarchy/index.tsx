// src/routes/admin/departments_group/department_types/hierarchy/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentTypeHierarchy } from '../../../../../components/admin/department_types/DepartmentTypeHierarchy';

export const Route = createFileRoute('/admin/departments_group/department_types/hierarchy/')({
    component: DepartmentTypeHierarchy,
});
