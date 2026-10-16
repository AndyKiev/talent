// src/routes/admin/departments_group/structure/organigram/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentOrganigram } from '../../../../../components/admin/departments/organigram/DepartmentOrganigram';

// ?focus=<departmentId> — the focused department (top of the view). Kept in
// the URL so browser Back steps back up.
export interface DepartmentOrganigramSearch {
    focus?: number;
}

export const Route = createFileRoute('/admin/departments_group/structure/organigram/')({
    component: DepartmentOrganigram,
    validateSearch: (search: Record<string, unknown>): DepartmentOrganigramSearch => {
        const n = Number(search.focus);
        return { focus: Number.isInteger(n) && n > 0 ? n : undefined };
    },
});
