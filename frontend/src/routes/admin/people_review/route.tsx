// src/routes/admin/people_review/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { PeopleReviewLayout } from '../../../components/admin/people_review/PeopleReviewLayout';

export const Route = createFileRoute('/admin/people_review')({
    component: PeopleReviewLayout,
});
