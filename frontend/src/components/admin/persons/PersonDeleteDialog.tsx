// src/components/admin/persons/PersonDeleteDialog.tsx
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
} from '@mui/material';
import type { Person } from './personApi';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';

interface Props {
    row: Person | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function PersonDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString();

    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{cfl(getString('deletePerson') || 'Delete Person')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body2">
                    {getString('areYouSureDeletePerson') ||
                        'Are you sure you want to delete this person? This action cannot be undone.'}
                </Typography>
                {row && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                            label={`${row.last_name} ${row.first_name}`}
                            size="small"
                            variant="outlined"
                        />
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onCancel} disabled={isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={onConfirm}
                    disabled={isPending}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('delete') || 'Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
