// src/routes/employees/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import {EmployeesPage} from "../../components/employees/EmployeesPage.tsx";

// Every list filter lives in the URL so Back always returns to the previous
// filter state (and a reload/bookmark restores the same view):
// ?dept=<main department id>&subdept=<name>&job=<name>&status=<name>
// &emp=<employee id>&q=<free text>.
export interface EmployeesSearch {
    dept?: number;
    subdept?: string;
    job?: string;
    status?: string;
    emp?: number;
    q?: string;
}

const toId = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : undefined;
};

const toText = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() !== '' ? v : undefined;

export const Route = createFileRoute("/employees/")({
    component: EmployeesPage,
    validateSearch: (search: Record<string, unknown>): EmployeesSearch => ({
        dept: toId(search.dept),
        subdept: toText(search.subdept),
        job: toText(search.job),
        status: toText(search.status),
        emp: toId(search.emp),
        q: toText(search.q),
    }),
});
