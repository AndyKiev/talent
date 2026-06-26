// src/routes/admin/people_review/review_setup/levels/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { LevelsLayout } from '../../../../../components/admin/review_setup/LevelsLayout';

export const Route = createFileRoute('/admin/people_review/review_setup/levels')({
    component: LevelsLayout,
});
