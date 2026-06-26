// src/routes/admin/people_review/reviewers/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ReviewersLayout } from '../../../../components/admin/reviewers/ReviewersLayout';

export const Route = createFileRoute('/admin/people_review/reviewers')({
    component: ReviewersLayout,
});
