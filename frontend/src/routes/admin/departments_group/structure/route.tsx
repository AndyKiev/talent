// src/routes/admin/departments_group/structure/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { StructureLayout } from '../../../../components/admin/departments/StructureLayout';

export const Route = createFileRoute('/admin/departments_group/structure')({
    component: StructureLayout,
});
