// src/routes/recruitment_dashboard/route.tsx — reuses the recruitment gated shell.
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentLayout } from '../../components/recruitment/RecruitmentLayout';

export const Route = createFileRoute('/recruitment_dashboard')({
    component: RecruitmentLayout,
});
