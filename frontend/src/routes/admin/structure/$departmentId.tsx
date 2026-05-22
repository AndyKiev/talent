// src/routes/admin/structure/$departmentId.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentDetailPage } from '../../../components/admin/departments/DepartmentDetailPage.tsx';

export const Route = createFileRoute('/admin/structure/$departmentId')({
  component: function DepartmentDetailRoute() {
    const { departmentId } = Route.useParams();
    return <DepartmentDetailPage departmentId={Number(departmentId)} />;
  },
});
