// src/routes/recruitment/$taskId/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentTaskLayout } from '../../../components/recruitment/tasks/RecruitmentTaskPage';

export const Route = createFileRoute('/recruitment/$taskId')({
    component: RecruitmentTaskLayout,
});
