// src/routes/recruitment/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentTasksPage } from '../../components/recruitment/tasks/RecruitmentTasksPage';

export const Route = createFileRoute('/recruitment/')({
    component: RecruitmentTasksPage,
});
