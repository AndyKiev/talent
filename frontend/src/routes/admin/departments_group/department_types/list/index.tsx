// src/routes/admin/departments_group/department_types/list/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentTypeCrud } from '../../../../../components/admin/department_types/DepartmentTypeCrud';

export const Route = createFileRoute('/admin/departments_group/department_types/list/')({
    component: DepartmentTypeCrud,
});
