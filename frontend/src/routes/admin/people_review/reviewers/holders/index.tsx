// src/routes/admin/people_review/reviewers/holders/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ProcessRoleHolderCrud } from '../../../../../components/admin/reviewers/process_role_holder/ProcessRoleHolderCrud';

export const Route = createFileRoute('/admin/people_review/reviewers/holders/')({
    component: ProcessRoleHolderCrud,
});
