import { createFileRoute } from '@tanstack/react-router';
import { HeadcountPlanPage } from '../../components/employees/headcount_plan/HeadcountPlanPage';

// Page state lives in the URL so navigating away (employee card) and coming
// back re-renders the same selection: ?top=<top dept>&dept=<exact dept>
// &date=<YYYY-MM-DD>&job=<fact-panel job>.
export interface HeadcountPlanSearch {
    dept?: number;
    top?: number;
    date?: string;
    job?: number;
}

const toId = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : undefined;
};

export const Route = createFileRoute('/employees/headcount_plan')({
    component: HeadcountPlanPage,
    validateSearch: (search: Record<string, unknown>): HeadcountPlanSearch => ({
        dept: toId(search.dept),
        top: toId(search.top),
        date:
            typeof search.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
                ? search.date
                : undefined,
        job: toId(search.job),
    }),
});
