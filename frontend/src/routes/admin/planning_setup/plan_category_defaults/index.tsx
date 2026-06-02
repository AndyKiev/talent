// src/routes/admin/planning_setup/plan_category_defaults/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { PlanCategoryDefaultCrud } from '../../../../components/admin/planning_setup/plan_category_default/PlanCategoryDefaultCrud';

export const Route = createFileRoute('/admin/planning_setup/plan_category_defaults/')({
    component: PlanCategoryDefaultCrud,
});