// src/routes/admin/departments_group/department_types/organigram/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentTypeOrganigram } from '../../../../../components/admin/department_types/organigram/DepartmentTypeOrganigram';

// ?path=<rootId>_<id>_<focusId> — the clicked drill path; the last id is the
// focused type. Kept in the URL so browser Back steps back up. Underscore,
// not dot: "1.7" looks like a number, so the router would JSON-quote it.
export interface DepartmentTypeOrganigramSearch {
    path?: string;
}

export const Route = createFileRoute('/admin/departments_group/department_types/organigram/')({
    component: DepartmentTypeOrganigram,
    validateSearch: (search: Record<string, unknown>): DepartmentTypeOrganigramSearch => ({
        path:
            typeof search.path === 'string' && /^\d+(_\d+)*$/.test(search.path)
                ? search.path
                : typeof search.path === 'number'
                  ? String(search.path)
                  : undefined,
    }),
});
