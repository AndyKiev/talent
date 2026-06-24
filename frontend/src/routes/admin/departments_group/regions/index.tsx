// src/routes/admin/departments_group/regions/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RegionCrud } from '../../../../components/admin/regions/RegionCrud';

export const Route = createFileRoute('/admin/departments_group/regions/')({
    component: () => <RegionCrud />,
});
