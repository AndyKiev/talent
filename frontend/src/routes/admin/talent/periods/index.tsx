// src/routes/admin/talent/periods/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { TalentPeriodCrud } from '../../../../components/admin/talent_periods/TalentPeriodCrud';

export const Route = createFileRoute('/admin/talent/periods/')({
    component: TalentPeriodCrud,
});
