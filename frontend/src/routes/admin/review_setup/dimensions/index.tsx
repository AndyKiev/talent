// src/routes/admin/review_setup/dimensions/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/review_setup/dimensions/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/review_setup/dimensions/list', replace: true });
    },
});
