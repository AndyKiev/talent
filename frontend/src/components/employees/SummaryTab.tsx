// src/components/employees/SummaryTab.tsx
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Paper, Grid, Typography, Stack, Chip, Box } from '@mui/material';
import { fetchEmployeeById } from './employeeApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

function Field({ label, value }: { label: string; value?: string | null }) {
    return (
        <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="body1">{value || '—'}</Typography>
        </Box>
    );
}

export function SummaryTab() {
    const { employeeId } = useParams({ from: '/employees/$employeeId/summary/' });
    const id = Number(employeeId);
    const getString = useString({ str });

    const { data: employee } = useQuery({
        queryKey: ['employee', id],
        queryFn: () => fetchEmployeeById(id),
        staleTime: 5 * 60 * 1000,
    });

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Field label={cfl(getString('code') || 'Code')} value={employee?.code} />
                    <Field label={cfl(getString('name') || 'Name')} value={employee?.name} />
                    <Field label={cfl(getString('email') || 'Email')} value={employee?.email} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Field label={cfl(getString('job') || 'Job')} value={employee?.job?.name} />
                    <Field
                        label={cfl(getString('employeeStatus') || 'Status')}
                        value={employee?.status?.name ? cfl(getString(employee.status.name) || employee.status.name) : '—'}
                    />
                    <Field
                        label={cfl(getString('isActive') || 'Active')}
                        value={employee?.is_active ? (getString('yes') || 'Yes') : (getString('no') || 'No')}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        {cfl(getString('mainDepartment') || 'Main department')}
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1.5 }}>
                        {(employee?.main_departments ?? []).length > 0
                            ? employee!.main_departments.map((d) => (
                                  <Chip key={d.id} label={d.name} size="small" variant="outlined" />
                              ))
                            : <Typography variant="body1">—</Typography>}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                        {cfl(getString('responsibilityDepts') || 'Responsibility departments')}
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {(employee?.extra_departments ?? []).length > 0
                            ? employee!.extra_departments.map((d) => (
                                  <Chip key={d.id} label={d.name} size="small" variant="outlined" />
                              ))
                            : <Typography variant="body1">—</Typography>}
                    </Stack>
                </Grid>
            </Grid>
        </Paper>
    );
}
