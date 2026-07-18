// src/components/ui/RouteErrorFallback.tsx
// App-wide route error boundary content (wired as the router's
// defaultErrorComponent in main.tsx). Any render/loader throw in a route
// lands here instead of white-screening the SPA. May render before the DB
// translations are loaded, so every string keeps a hardcoded fallback.
import { Alert, Box, Button, Typography } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import type { ErrorComponentProps } from '@tanstack/react-router';
import useString from '../../hooks/useString';

export default function RouteErrorFallback({ error }: ErrorComponentProps) {
    const getString = useString();

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                gap: 2,
                p: 3,
            }}
        >
            <Typography variant="h6">
                {getString('somethingWentWrong') || 'Something went wrong'}
            </Typography>
            <Alert severity="error" sx={{ maxWidth: 560, width: '100%', overflowX: 'auto' }}>
                {error instanceof Error ? error.message : String(error)}
            </Alert>
            <Button
                variant="contained"
                startIcon={<ReplayIcon />}
                onClick={() => window.location.reload()}
            >
                {getString('tryReload') || 'Reload'}
            </Button>
        </Box>
    );
}
