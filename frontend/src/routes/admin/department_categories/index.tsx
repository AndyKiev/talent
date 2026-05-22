// src/routes/admin/department_categories/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentCategoriesPage } from '../../../components/admin/department_categories/DepartmentCategoriesPage';

export const Route = createFileRoute('/admin/department_categories/')({
    component: DepartmentCategoriesPage,
});