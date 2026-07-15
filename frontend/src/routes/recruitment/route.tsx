// src/routes/recruitment/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentLayout } from '../../components/recruitment/RecruitmentLayout';

export const Route = createFileRoute('/recruitment')({
    component: RecruitmentLayout,
});
