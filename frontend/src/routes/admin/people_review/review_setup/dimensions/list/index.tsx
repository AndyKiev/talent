// src/routes/admin/people_review/review_setup/dimensions/list/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ReviewDimensionCrud } from '../../../../../../components/admin/review_dimensions/ReviewDimensionCrud';

export const Route = createFileRoute('/admin/people_review/review_setup/dimensions/list/')({
    component: ReviewDimensionCrud,
});
