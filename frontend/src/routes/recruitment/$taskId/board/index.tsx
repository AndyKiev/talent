// src/routes/recruitment/$taskId/board/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentTaskBoardTab } from '../../../../components/recruitment/tasks/RecruitmentTaskPage';

export const Route = createFileRoute('/recruitment/$taskId/board/')({
    component: RecruitmentTaskBoardTab,
});
