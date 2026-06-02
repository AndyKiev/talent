// src/routes/admin/departments_group/structure/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentTree } from '../../../../components/admin/departments/DepartmentTree';

export const Route = createFileRoute('/admin/departments_group/structure/')({
  component: () => <DepartmentTree selectedId={null} />,
});