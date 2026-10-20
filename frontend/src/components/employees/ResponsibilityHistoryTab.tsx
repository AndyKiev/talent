// src/components/employees/ResponsibilityHistoryTab.tsx
import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Paper,
    Typography,
    Stack,
    Chip,
    Box,
    Button,
    Divider,
    CircularProgress,
    Snackbar,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import {
    fetchResponsibilityHistory,
    type ResponsibilityHistoryEntry,
} from './employee_events/employeeEventApi';
import { ResponsibilityChangeDialog } from './ResponsibilityChangeDialog';
import useString from '../../hooks/useString';
import cfl from '../../utils/helpers.ts';
import { formatToUkrDate } from '../../utils/dateFormatter';

export function ResponsibilityHistoryTab() {
    const { employeeId } = useParams({ from: '/employees/$employeeId/responsibility_history/' });
    const id = Number(employeeId);
    const getString = useString();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [snackMsg, setSnackMsg] = useState<string | null>(null);

    const { data: history = [], isLoading } = useQuery<ResponsibilityHistoryEntry[]>({
        queryKey: ['responsibility-history', id],
        queryFn: () => fetchResponsibilityHistory(id),
        staleTime: 2 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress size={24} />
            </Paper>
        );
    }

    // Latest applied entry = the current responsibility area (prefills the dialog).
    const currentTypeIds = (history[0]?.departments ?? []).map((d) => d.id);

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => setDialogOpen(true)}
                >
                    {cfl(getString('changeResponsibility') || 'Change responsibility area')}
                </Button>
            </Box>

            {history.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3 }}>
                    <Typography color="text.secondary">
                        {cfl(getString('noResponsibilityHistory') || 'No responsibility history yet')}
                    </Typography>
                </Paper>
            ) : (
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack divider={<Divider />} spacing={2}>
                        {history.map((entry, idx) => (
                            <Box key={idx}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2">
                                        {formatToUkrDate(entry.effective_date)}
                                    </Typography>
                                    {entry.event_type && (
                                        <Chip label={entry.event_type} size="small" variant="outlined" />
                                    )}
                                </Stack>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                    {entry.departments.map((d) => (
                                        <Chip key={d.id} label={d.name ?? `#${d.id}`} size="small" variant="outlined" />
                                    ))}
                                </Stack>
                            </Box>
                        ))}
                    </Stack>
                </Paper>
            )}

            {dialogOpen && (
                <ResponsibilityChangeDialog
                    employeeId={id}
                    currentTypeIds={currentTypeIds}
                    onClose={() => setDialogOpen(false)}
                    onDone={(message) => {
                        setDialogOpen(false);
                        setSnackMsg(message);
                    }}
                    getString={getString}
                />
            )}

            <Snackbar
                open={!!snackMsg}
                autoHideDuration={4000}
                onClose={() => setSnackMsg(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="success" onClose={() => setSnackMsg(null)}>
                    {snackMsg}
                </Alert>
            </Snackbar>
        </>
    );
}
