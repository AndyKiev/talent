// src/routes/admin/people_review/reviewers/auto_assignment/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { OversightAssignmentPanel } from '../../../../../components/admin/reviewers/oversight_assignment/OversightAssignmentPanel';

export const Route = createFileRoute('/admin/people_review/reviewers/auto_assignment/')({
    component: OversightAssignmentPanel,
});
