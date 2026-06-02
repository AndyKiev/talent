// src/routes/admin/planning_setup/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/planning_setup/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/planning_setup/plan_session_status', replace: true });
    },
});