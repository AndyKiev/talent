// src/routes/admin/talent/statuses/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { TalentStatusCrud } from '../../../../components/admin/talent_statuses/TalentStatusCrud';

export const Route = createFileRoute('/admin/talent/statuses/')({
    component: TalentStatusCrud,
});
