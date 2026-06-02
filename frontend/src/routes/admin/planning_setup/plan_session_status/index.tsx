// src/routes/admin/planning_setup/plan_session_status/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { PlanSessionStatusCrud } from '../../../../components/admin/planning_setup/plan_session_status/PlanSessionStatusCrud';

export const Route = createFileRoute('/admin/planning_setup/plan_session_status/')({
    component: PlanSessionStatusCrud,
});