// src/routes/planning/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { PlanningPage } from '../../components/planning/PlanningPage';

export const Route = createFileRoute('/planning')({
    component: PlanningPage,
});