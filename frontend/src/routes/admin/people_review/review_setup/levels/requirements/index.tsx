// src/routes/admin/people_review/review_setup/levels/requirements/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ReviewLevelRequirementCrud } from '../../../../../../components/admin/review_level_requirements/ReviewLevelRequirementCrud';

export const Route = createFileRoute('/admin/people_review/review_setup/levels/requirements/')({
    component: ReviewLevelRequirementCrud,
});
