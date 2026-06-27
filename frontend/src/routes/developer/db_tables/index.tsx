import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/developer/db_tables/')({
    beforeLoad: () => {
        throw redirect({ to: '/developer/catalog/db_tables' });
    },
});
