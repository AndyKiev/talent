// src/routes/recruitment_board/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentBoardPage } from '../../components/recruitment/board/RecruitmentBoardPage';

export const Route = createFileRoute('/recruitment_board/')({
    component: RecruitmentBoardPage,
});
