// src/routes/admin/people_review/reviewers/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/people_review/reviewers/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/people_review/reviewers/holders', replace: true });
    },
});
