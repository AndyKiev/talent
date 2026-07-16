// src/routes/recruitment/$taskId/index.tsx — the board is the default tab.
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/recruitment/$taskId/')({
    beforeLoad: ({ params }) => {
        throw redirect({ to: '/recruitment/$taskId/board', params });
    },
});
