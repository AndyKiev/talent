// src/routes/candidates/$candidateId/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { CandidateDetailPage } from '../../../components/candidates/CandidateDetailPage';

export const Route = createFileRoute('/candidates/$candidateId/')({
    component: CandidateDetailPage,
});
