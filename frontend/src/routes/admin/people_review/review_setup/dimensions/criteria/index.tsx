// src/routes/admin/people_review/review_setup/dimensions/criteria/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ReviewCriteriaManager } from '../../../../../../components/admin/review_dimensions/ReviewCriteriaManager';

export const Route = createFileRoute('/admin/people_review/review_setup/dimensions/criteria/')({
    component: ReviewCriteriaManager,
});
