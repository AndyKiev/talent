// src/routes/admin/talent-periods/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import {TalentPeriodsPage} from "../../../components/admin/talent-periods/TalentPeriodsPage.tsx";

export const Route = createFileRoute('/admin/talent-periods/')({
    component: TalentPeriodsPage,
});
