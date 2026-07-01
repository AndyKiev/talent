// src/components/admin/job_categories/JobCategoryDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
} from '@mui/material';
import type { JobCategory } from './jobCategoryApi';
import useString from '../../../hooks/useString';

interface Props {
    row: JobCategory | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function JobCategoryDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString();

    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('deleteJobCategory') || 'Delete Job Category'}</DialogTitle>
            <DialogContent>
                <Typography variant="body2">
                    {getString('areYouSureDeleteJobCategory', { key: row?.key ?? '' }) ||
                        `Are you sure you want to delete "${row?.key}"? Its job links will be removed. This action cannot be undone.`}
                </Typography>
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
