// src/routes/admin/review_setup/levels/list/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ReviewLevelCrud } from '../../../../../components/admin/review_levels/ReviewLevelCrud';

export const Route = createFileRoute('/admin/review_setup/levels/list/')({
    component: ReviewLevelCrud,
});
