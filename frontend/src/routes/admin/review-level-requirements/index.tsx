import { createFileRoute } from '@tanstack/react-router';
import { ReviewLevelRequirementsPage } from '../../../components/admin/review-level-requirements/ReviewLevelRequirementsPage.tsx';

export const Route = createFileRoute('/admin/review-level-requirements/')({
    component: ReviewLevelRequirementsPage,
});
