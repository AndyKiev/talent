// src/routes/candidates/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentCandidatesPage } from '../../components/recruitment/candidates/RecruitmentCandidatesPage';

export const Route = createFileRoute('/candidates/')({
    component: RecruitmentCandidatesPage,
});
