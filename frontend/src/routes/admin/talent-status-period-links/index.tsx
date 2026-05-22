// src/routes/admin/talent-status-period-links/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import {TalentStatusPeriodLinksPage} from "../../../components/admin/talent-status-period-links/TalentStatusPeriodLinksPage.tsx";

export const Route = createFileRoute('/admin/talent-status-period-links/')({
  component: TalentStatusPeriodLinksPage,
});
