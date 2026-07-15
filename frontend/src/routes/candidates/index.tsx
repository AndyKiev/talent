// src/routes/candidates/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { CandidatesPage } from '../../components/candidates/CandidatesPage';

export const Route = createFileRoute('/candidates/')({
    component: CandidatesPage,
});
