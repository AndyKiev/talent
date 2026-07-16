// src/routes/recruitment/$taskId/requirements/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentTaskRequirementsTab } from '../../../../components/recruitment/tasks/RecruitmentTaskPage';

export const Route = createFileRoute('/recruitment/$taskId/requirements/')({
    component: RecruitmentTaskRequirementsTab,
});
