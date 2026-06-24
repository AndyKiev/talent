// src/routes/developer/security/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/developer/security/')({
    beforeLoad: () => {
        throw redirect({ to: '/developer/security/user_groups' });
    },
});
