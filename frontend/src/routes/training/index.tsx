// src/routes/training/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

// /training has no own screen — land on the first tab.
export const Route = createFileRoute('/training/')({
    beforeLoad: () => {
        throw redirect({ to: '/training/types' });
    },
});
