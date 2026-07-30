// src/routes/interviews/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentInterviewsPage } from '../../components/recruitment/interviews/RecruitmentInterviewsPage';

export const Route = createFileRoute('/interviews/')({
    component: RecruitmentInterviewsPage,
});
