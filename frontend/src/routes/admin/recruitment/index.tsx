// src/routes/admin/recruitment/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

// /admin/recruitment has no own screen — land on the first tab.
export const Route = createFileRoute('/admin/recruitment/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/recruitment/dimensions' });
    },
});
