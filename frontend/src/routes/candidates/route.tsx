// src/routes/candidates/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { CandidatesLayout } from '../../components/candidates/CandidatesLayout';

export const Route = createFileRoute('/candidates')({
    component: CandidatesLayout,
});
