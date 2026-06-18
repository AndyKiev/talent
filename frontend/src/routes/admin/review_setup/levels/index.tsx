// src/routes/admin/review_setup/levels/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/review_setup/levels/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/review_setup/levels/list', replace: true });
    },
});
