// src/routes/admin/people_review/review_setup/dimensions/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/people_review/review_setup/dimensions/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/people_review/review_setup/dimensions/list', replace: true });
    },
});
