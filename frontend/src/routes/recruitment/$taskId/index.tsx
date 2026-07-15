// src/routes/recruitment/$taskId/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentTaskPage } from '../../../components/recruitment/tasks/RecruitmentTaskPage';

export const Route = createFileRoute('/recruitment/$taskId/')({
    component: RecruitmentTaskPage,
});
