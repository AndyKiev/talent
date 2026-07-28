// src/components/ui/AsyncContent.tsx
import type { ReactNode } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';

interface AsyncContentProps {
    isLoading: boolean;
    error?: unknown;
    children: ReactNode;
}

/**
 * Standard loading / error / content switch for a data-backed section: a centred
 * spinner while loading, the error message as an Alert, otherwise the children.
 *
 * Replaces the hand-rolled triple that used to be copied into every list page:
 *   {isLoading && (<Box><CircularProgress /></Box>)}
 *   {!isLoading && error && (<Alert .../>)}
 *   {!isLoading && !error && (<Paper>...</Paper>)}
 *
 * The children keep owning their own wrapper (Paper, sx, empty state) — this
 * component only owns the spinner, the Alert and the pass-through.
 */
export function AsyncContent({ isLoading, error, children }: AsyncContentProps) {
    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                {(error as Error).message}
            </Alert>
        );
    }

    return <>{children}</>;
}
