// src/routes/recruitment_board/route.tsx — reuses the recruitment gated shell.
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentLayout } from '../../components/recruitment/RecruitmentLayout';

export const Route = createFileRoute('/recruitment_board')({
    component: RecruitmentLayout,
});
