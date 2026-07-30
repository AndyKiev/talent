// src/routes/candidates/$candidateId/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentCandidateDetailPage } from '../../../components/recruitment/candidates/RecruitmentCandidateDetailPage';

export const Route = createFileRoute('/candidates/$candidateId/')({
    component: RecruitmentCandidateDetailPage,
});
