// src/routes/admin/talent/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

// /admin/talent has no own screen — land on the first tab.
export const Route = createFileRoute('/admin/talent/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/talent/status_period_links' });
    },
});
