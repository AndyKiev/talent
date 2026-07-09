// src/components/layout/PageContainer.tsx
import { type ReactNode } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

// Canonical page width. Every page centers within this so the left edge — and
// therefore the breadcrumbs ("Головна") — starts at the SAME indent on every
// screen, no matter the page. Change here to reflow the whole app at once.
export const PAGE_MAX_WIDTH = 1800;

interface PageContainerProps {
    children: ReactNode;
    // Grid / full-height pages: fill the viewport below the 56px sticky AppBar and
    // let inner content (e.g. a DataGrid) scroll internally with pinned headers,
    // instead of the whole page scrolling. Plain (form/list) pages omit this and
    // flow normally.
    fill?: boolean;
    // Extra sx merged last (per-page tweaks). Avoid overriding px / maxWidth / mx
    // here — that's exactly the drift this component exists to remove.
    sx?: SxProps<Theme>;
}

export function PageContainer({ children, fill = false, sx }: PageContainerProps) {
    return (
        <Box
            sx={{
                px: { xs: 2, sm: 3 },
                py: { xs: 2, sm: 3 },
                maxWidth: PAGE_MAX_WIDTH,
                mx: 'auto',
                width: '100%',
                ...(fill && {
                    height: 'calc(100vh - 56px)',
                    '@supports (height: 100dvh)': { height: 'calc(100dvh - 56px)' },
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }),
                ...sx,
            }}
        >
            {children}
        </Box>
    );
}

export default PageContainer;
