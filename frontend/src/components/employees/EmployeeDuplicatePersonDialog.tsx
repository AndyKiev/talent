// src/components/employees/EmployeeDuplicatePersonDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
    Chip,
    Box,
    Paper,
    Stack,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { PersonNameMatch } from '../admin/persons/personApi';
import useString from '../../hooks/useString';
import cfl from '../../utils/helpers.ts';

interface Props {
    open: boolean;
    matches: PersonNameMatch[];
    isPending: boolean;
    /** User confirmed: create the employee anyway (new person, next dedupe no). */
    onConfirm: () => void;
    onCancel: () => void;
}

export function EmployeeDuplicatePersonDialog({
    open,
    matches,
    isPending,
    onConfirm,
    onCancel,
}: Props) {
    const getString = useString();

    return (
        <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon color="warning" />
                {cfl(getString('duplicatePersonTitle') || 'Person already exists')}
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body2">
                    {getString('duplicatePersonWarning') ||
                        'A person with the same first and last name already exists. Check that you are not creating the same employee twice.'}
                </Typography>

                <Stack spacing={1}>
                    {matches.map((m) => (
                        <Paper
                            key={m.person_id}
                            variant="outlined"
                            sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}
                        >
                            <Typography fontSize={14} fontWeight={600}>
                                {m.last_name} {m.first_name}
                                {m.patronymic ? ` ${m.patronymic}` : ''}
                            </Typography>
                            {m.employees.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">
                                    {getString('noLinkedEmployees') || 'No linked employees'}
                                </Typography>
                            ) : (
                                m.employees.map((e) => (
                                    <Box
                                        key={e.id}
                                        sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}
                                    >
                                        <Chip
                                            label={e.code}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                                        />
                                        {e.job_name && (
                                            <Chip label={e.job_name} size="small" color="primary" variant="outlined" />
                                        )}
                                        {e.department_name && (
                                            <Chip label={e.department_name} size="small" variant="outlined" />
                                        )}
                                    </Box>
                                ))
                            )}
                        </Paper>
                    ))}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onCancel} disabled={isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    color="warning"
                    onClick={onConfirm}
                    disabled={isPending}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('createAnyway') || 'Create anyway'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
