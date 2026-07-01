// src/routes/admin/training/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

// /admin/training has no own screen — land on the first tab.
export const Route = createFileRoute('/admin/training/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/training/categories' });
    },
});
