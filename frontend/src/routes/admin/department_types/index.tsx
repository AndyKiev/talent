// src/routes/admin/department_types/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentTypesPage } from '../../../components/admin/department_types/DepartmentTypesPage';

export const Route = createFileRoute('/admin/department_types/')({
    component: DepartmentTypesPage,
});
