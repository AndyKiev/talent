// src/routes/admin/reviewers/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/reviewers/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/reviewers/holders', replace: true });
    },
});
