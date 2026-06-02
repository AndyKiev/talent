// src/routes/admin/departments_group/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentsGroupLayout } from '../../../components/admin/departments/DepartmentsGroupLayout';

export const Route = createFileRoute('/admin/departments_group')({
    component: DepartmentsGroupLayout,
});
