// src/routes/candidates/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentCandidatesLayout } from '../../components/recruitment/candidates/RecruitmentCandidatesLayout';

export const Route = createFileRoute('/candidates')({
    component: RecruitmentCandidatesLayout,
});
