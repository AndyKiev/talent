// src/routes/admin/structure/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { StructurePage } from '../../../components/admin/departments/StructurePage';

export const Route = createFileRoute('/admin/structure/')({
  component: StructurePage,
});
