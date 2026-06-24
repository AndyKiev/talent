// src/routes/developer/catalog/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/developer/catalog/')({
    beforeLoad: () => {
        throw redirect({ to: '/developer/catalog/operations' });
    },
});