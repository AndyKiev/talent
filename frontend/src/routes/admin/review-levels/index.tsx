import { createFileRoute } from '@tanstack/react-router';
import { ReviewLevelsPage } from '../../../components/admin/review-levels/ReviewLevelsPage.tsx';

export const Route = createFileRoute('/admin/review-levels/')({
    component: ReviewLevelsPage,
});
