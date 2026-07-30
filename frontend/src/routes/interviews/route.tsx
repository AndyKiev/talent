// src/routes/interviews/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentInterviewsLayout } from '../../components/recruitment/interviews/RecruitmentInterviewsLayout';

export const Route = createFileRoute('/interviews')({
    component: RecruitmentInterviewsLayout,
});
