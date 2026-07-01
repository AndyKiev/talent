import { createFileRoute } from '@tanstack/react-router';
import { PlanSessionDetailPage } from '../../../components/planning/PlanSessionDetailPage';

type PlanSessionView = 'scope' | 'report';

export const Route = createFileRoute('/planning/$sessionId/')({
    component: PlanSessionDetailPage,
    // `view` selects the plan-values editor (default) or the plan-vs-fact report.
    validateSearch: (search: Record<string, unknown>): { view: PlanSessionView } => ({
        view: search.view === 'report' ? 'report' : 'scope',
    }),
});
