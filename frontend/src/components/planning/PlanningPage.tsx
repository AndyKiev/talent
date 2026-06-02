// src/components/planning/PlanningPage.tsx
import { useState } from 'react';
import AppShell from '../layout/AppShell';
import { Box, Breadcrumbs, Button, Link as MuiLink, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link } from '@tanstack/react-router';
import { PlanSessionsCrud } from './PlanSessionsCrud';
import { PlanScopeGrid } from './PlanScopeGrid';
import type { PlanSession } from './planningApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

export function PlanningPage() {
    const getString = useString({ str });
    const [editing, setEditing] = useState<PlanSession | null>(null);

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1300, mx: 'auto' }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('home') || 'Home')}
                        </Typography>
                    </Link>
                    {editing ? (
                        <MuiLink
                            component="button"
                            underline="none"
                            color="text.secondary"
                            onClick={() => setEditing(null)}
                        >
                            <Typography variant="body2" color="text.secondary">
                                {cfl(getString('planning') || 'Planning')}
                            </Typography>
                        </MuiLink>
                    ) : (
                        <Typography variant="body2" color="text.primary" fontWeight={600}>
                            {cfl(getString('planning') || 'Planning')}
                        </Typography>
                    )}
                    {editing && (
                        <Typography variant="body2" color="text.primary" fontWeight={600}>
                            {editing.name}
                        </Typography>
                    )}
                </Breadcrumbs>

                {editing ? (
                    <Box>
                        <Button
                            variant="text"
                            size="small"
                            startIcon={<ArrowBackIcon />}
                            onClick={() => setEditing(null)}
                            sx={{ mb: 2 }}
                        >
                            {getString('backToSessions') || 'Back to sessions'}
                        </Button>
                        <PlanScopeGrid session={editing} />
                    </Box>
                ) : (
                    <PlanSessionsCrud onEditPlan={setEditing} />
                )}
            </Box>
        </AppShell>
    );
}
