// src/routes/recruitment_dashboard/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentDashboardPage } from '../../components/recruitment/dashboard/RecruitmentDashboardPage';

export const Route = createFileRoute('/recruitment_dashboard/')({
    component: RecruitmentDashboardPage,
});
