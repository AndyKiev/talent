// src/routes/admin/people_review/review_setup/levels/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/people_review/review_setup/levels/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/people_review/review_setup/levels/list', replace: true });
    },
});
