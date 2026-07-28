// src/components/ui/PageBreadcrumbs.tsx
// The breadcrumb trail every page repeated verbatim: NavigateNext separators,
// muted links for the ancestors, bold text for the current page. Labels are
// resolved by the caller (getString/cfl/plain text), so this component never
// touches translations and stays usable for dynamic names too.
import type { ReactNode } from 'react';
import { Breadcrumbs, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link, type LinkProps } from '@tanstack/react-router';

export interface Crumb {
    /** Where the crumb links to. The last (current) crumb omits it. */
    to?: LinkProps['to'];
    /** Route params for `to`, when it has dynamic segments. */
    params?: LinkProps['params'];
    label: ReactNode;
}

interface Props {
    items: Crumb[];
    /** Merged over the default `mb: 3`. */
    sx?: SxProps<Theme>;
}

export function PageBreadcrumbs({ items, sx }: Props) {
    return (
        <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 3, ...sx }}
        >
            {items.map((crumb, index) =>
                crumb.to ? (
                    <Link
                        key={index}
                        to={crumb.to}
                        params={crumb.params}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            {crumb.label}
                        </Typography>
                    </Link>
                ) : (
                    <Typography
                        key={index}
                        variant="body2"
                        color="text.primary"
                        fontWeight={600}
                    >
                        {crumb.label}
                    </Typography>
                ),
            )}
        </Breadcrumbs>
    );
}
