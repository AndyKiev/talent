// src/routes/admin/recruitment/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentAdminLayout } from '../../../components/admin/recruitment/RecruitmentAdminLayout';

export const Route = createFileRoute('/admin/recruitment')({
    component: RecruitmentAdminLayout,
});
