// src/routes/admin/review_setup/dimensions/criteria/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ReviewCriteriaManager } from '../../../../../components/admin/review_dimensions/ReviewCriteriaManager';

export const Route = createFileRoute('/admin/review_setup/dimensions/criteria/')({
    component: ReviewCriteriaManager,
});
