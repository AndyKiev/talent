// src/routes/developer/process_roles/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/developer/process_roles/')({
    beforeLoad: () => {
        throw redirect({ to: '/developer/process_roles/process', replace: true });
    },
});
