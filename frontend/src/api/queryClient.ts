// src/api/queryClient.ts
//
// The app-wide TanStack Query client, extracted to its own module so
// non-React code (e.g. the auth store) can flush it. The cache holds
// USER-SCOPED data (my scopes, my menus, effective settings, review rows...),
// so it MUST be cleared whenever the authenticated identity changes —
// otherwise a user switch keeps serving the previous user's data.
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();
