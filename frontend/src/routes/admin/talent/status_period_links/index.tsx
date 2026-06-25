// src/routes/admin/talent/status_period_links/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { TalentStatusPeriodLinkCrud } from '../../../../components/admin/talent_status_period_links/TalentStatusPeriodLinkCrud';

export const Route = createFileRoute('/admin/talent/status_period_links/')({
    component: TalentStatusPeriodLinkCrud,
});
