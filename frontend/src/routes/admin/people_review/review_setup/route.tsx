// src/routes/admin/people_review/review_setup/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ReviewSetupLayout } from '../../../../components/admin/review_setup/ReviewSetupLayout';

export const Route = createFileRoute('/admin/people_review/review_setup')({
    component: ReviewSetupLayout,
});
