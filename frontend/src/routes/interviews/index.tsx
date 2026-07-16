// src/routes/interviews/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { InterviewsPage } from '../../components/interviews/InterviewsPage';

export const Route = createFileRoute('/interviews/')({
    component: InterviewsPage,
});
