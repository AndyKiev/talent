// src/routes/admin/talent-statuses/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import {TalentStatusesPage} from "../../../components/admin/talent-statuses/TalentStatusesPage.tsx";

export const Route = createFileRoute('/admin/talent-statuses/')({
  component: TalentStatusesPage,
});
