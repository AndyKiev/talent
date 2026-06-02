// src/routes/admin/planning_setup/plan_scope_defaults/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { PlanScopeDefaultCrud } from '../../../../components/admin/planning_setup/plan_scope_default/PlanScopeDefaultCrud';

export const Route = createFileRoute('/admin/planning_setup/plan_scope_defaults/')({
    component: PlanScopeDefaultCrud,
});