// src/api/queryClient.ts
//
// The app-wide TanStack Query client, extracted to its own module so
// non-React code (e.g. the auth store) can flush it. The cache holds
// USER-SCOPED data (my scopes, my menus, effective settings, review rows...),
// so it MUST be cleared whenever the authenticated identity changes —
// otherwise a user switch keeps serving the previous user's data.
import { QueryClient } from '@tanstack/react-query';

// App-wide query defaults. Per-call options still override these; they exist
// so the ~200 useQuery sites that don't set anything stop refetching on every
// mount and every window focus (refetch storms on tab switches).
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});
