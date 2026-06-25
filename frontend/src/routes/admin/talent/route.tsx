// src/routes/admin/talent/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { TalentLayout } from '../../../components/admin/talent/TalentLayout';

export const Route = createFileRoute('/admin/talent')({
    component: TalentLayout,
});
