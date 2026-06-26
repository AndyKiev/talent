// src/components/employees/SummaryTab.tsx
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Paper, Grid, Typography, Chip, Box, IconButton, Tooltip, Alert, Snackbar } from '@mui/material';
import { useState } from 'react';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { fetchEmployeeById, type MainDepartment } from './employeeApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import { useClipboard } from '../../hooks/useClipboard';
import cfl from '../../utils/helpers.ts';

function Field({
    label,
    value,
    copyButton,
}: {
    label: string;
    value?: string | null;
    copyButton?: React.ReactNode;
}) {
    return (
        <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                {copyButton}
            </Box>
            <Typography variant="body1">{value || '—'}</Typography>
        </Box>
    );
}

// One row: derived top-level unit (board / directorate / store) › specific dept.
function DeptRow({ dept }: { dept: MainDepartment }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
            {dept.top_department && (
                <>
                    <Chip label={dept.top_department.name} size="small" color="success" variant="filled" />
                    <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                </>
            )}
            <Chip label={dept.name} size="small" color="primary" variant="outlined" />
        </Box>
    );
}

export function SummaryTab() {
    const { employeeId } = useParams({ from: '/employees/$employeeId/summary/' });
    const id = Number(employeeId);
    const getString = useString({ str });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const { copyToClipboard } = useClipboard({
        onSuccess: (message) => setSnackbar({ open: true, message, severity: 'success' }),
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });

    const { data: employee } = useQuery({
        queryKey: ['employee', id],
        queryFn: () => fetchEmployeeById(id),
        staleTime: 5 * 60 * 1000,
    });

    const mainDepts = employee?.main_departments ?? [];
    const extraDepts = employee?.extra_departments ?? [];

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={3}>
                {/* Code & name intentionally omitted — shown in the card header. */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Field
                        label={cfl(getString('email') || 'Email')}
                        value={employee?.email}
                        copyButton={
                            employee?.email ? (
                                <Tooltip title={cfl(getString('copyCode') || 'Copy')}>
                                    <IconButton size="small" onClick={() => void copyToClipboard(employee.email!)} sx={{ p: 0.25 }}>
                                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Tooltip>
                            ) : undefined
                        }
                    />
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

                {/* Departments (folded in from the former Departments tab) */}
                <Grid size={{ xs: 12, sm: 6, md: 8 }}>
                    <Typography variant="caption" color="text.secondary">
                        {cfl(getString('mainDepartment') || 'Main department')}
                    </Typography>
                    <Box sx={{ mb: 2, mt: 0.5 }}>
                        {mainDepts.length > 0
                            ? mainDepts.map((d) => <DeptRow key={d.id} dept={d} />)
                            : <Typography variant="body1">—</Typography>}
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                        {cfl(getString('responsibilityDepts') || 'Responsibility departments')}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                        {extraDepts.length > 0
                            ? extraDepts.map((d) => <DeptRow key={d.id} dept={d} />)
                            : <Typography variant="body1">—</Typography>}
                    </Box>
                </Grid>
            </Grid>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Paper>
    );
}