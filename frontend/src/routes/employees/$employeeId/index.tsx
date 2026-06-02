// src/routes/employees/$employeeId/index.tsx
// Landing on /employees/{id} redirects to the summary tab.
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/employees/$employeeId/')({
    beforeLoad: ({ params }) => {
        throw redirect({
            to: '/employees/$employeeId/summary',
            params: { employeeId: params.employeeId },
        });
    },
});