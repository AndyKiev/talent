import { createFileRoute } from '@tanstack/react-router';
import { PlanningSessionsPage } from '../../components/planning/PlanningSessionsPage';

export const Route = createFileRoute('/planning/')({
    component: PlanningSessionsPage,
});
