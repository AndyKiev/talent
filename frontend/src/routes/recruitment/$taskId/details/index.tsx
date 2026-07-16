// src/routes/recruitment/$taskId/details/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentTaskDetailsTab } from '../../../../components/recruitment/tasks/RecruitmentTaskPage';

export const Route = createFileRoute('/recruitment/$taskId/details/')({
    component: RecruitmentTaskDetailsTab,
});
