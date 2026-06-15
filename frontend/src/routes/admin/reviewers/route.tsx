// src/routes/admin/reviewers/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ReviewersLayout } from '../../../components/admin/reviewers/ReviewersLayout';

export const Route = createFileRoute('/admin/reviewers')({
    component: ReviewersLayout,
});
