// src/routes/admin/review_setup/levels/requirements/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ReviewLevelRequirementCrud } from '../../../../../components/admin/review_level_requirements/ReviewLevelRequirementCrud';

export const Route = createFileRoute('/admin/review_setup/levels/requirements/')({
    component: ReviewLevelRequirementCrud,
});
