// src/routes/admin/planning_setup/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { PlanningSetupLayout } from '../../../components/admin/planning_setup/PlanningSetupLayout';

export const Route = createFileRoute('/admin/planning_setup')({
    component: PlanningSetupLayout,
});