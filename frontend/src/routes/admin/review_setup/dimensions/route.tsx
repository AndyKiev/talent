// src/routes/admin/review_setup/dimensions/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DimensionsLayout } from '../../../../components/admin/review_setup/DimensionsLayout';

export const Route = createFileRoute('/admin/review_setup/dimensions')({
    component: DimensionsLayout,
});
