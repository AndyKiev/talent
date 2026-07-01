// src/routes/admin/training/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { TrainingAdminLayout } from '../../../components/admin/training/TrainingAdminLayout';

export const Route = createFileRoute('/admin/training')({
    component: TrainingAdminLayout,
});
