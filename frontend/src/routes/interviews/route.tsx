// src/routes/interviews/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { InterviewsLayout } from '../../components/interviews/InterviewsLayout';

export const Route = createFileRoute('/interviews')({
    component: InterviewsLayout,
});
