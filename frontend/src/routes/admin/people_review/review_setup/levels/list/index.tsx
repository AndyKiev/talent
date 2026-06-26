// src/routes/admin/people_review/review_setup/levels/list/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ReviewLevelCrud } from '../../../../../../components/admin/review_levels/ReviewLevelCrud';

export const Route = createFileRoute('/admin/people_review/review_setup/levels/list/')({
    component: ReviewLevelCrud,
});
