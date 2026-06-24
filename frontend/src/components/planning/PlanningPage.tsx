// src/components/planning/PlanningPage.tsx
import { useState } from 'react';
import AppShell from '../layout/AppShell';
import { Box, Breadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { PlanSessionsCrud } from './PlanSessionsCrud';
import { PlanScopeGrid } from './PlanScopeGrid';
import { PlanReportGrid } from './PlanReportGrid';
import type { PlanSession } from './planningApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

export function PlanningPage() {
    const getString = useString({ str });
    const [editing, setEditing] = useState<PlanSession | null>(null);
    const [reporting, setReporting] = useState<PlanSession | null>(null);
    const active = editing ?? reporting;

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1300, mx: 'auto' }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('home') || 'Home')}
                        </Typography>
                    </Link>
                    {active ? (
                        <MuiLink
                            component="button"
                            underline="none"
                            color="text.secondary"
                            onClick={() => { setEditing(null); setReporting(null); }}
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
                    {active && (
                        <Typography variant="body2" color="text.primary" fontWeight={600}>
                            {reporting
                                ? `${reporting.name} — ${cfl(getString('planVsFact')) || 'Plan vs Fact'}`
                                : active.name}
                        </Typography>
                    )}
                </Breadcrumbs>

                {editing ? (
                    <PlanScopeGrid session={editing} />
                ) : reporting ? (
                    <PlanReportGrid session={reporting} />
                ) : (
                    <PlanSessionsCrud
                        onEditPlan={(s) => { setReporting(null); setEditing(s); }}
                        onShowReport={(s) => { setEditing(null); setReporting(s); }}
                    />
                )}
            </Box>
        </AppShell>
    );
}
