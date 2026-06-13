import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { GetStringFn } from '../../types/getStringFn';

interface Props {
    open: boolean;
    /** Already-resolved confirmation message (e.g. getString('confirmDeleteChildMessage')). */
    message: string;
    /** Optional identifier of the record being removed, shown beneath the message. */
    itemLabel?: string;
    isDeleting?: boolean;
    getString: GetStringFn;
    onConfirm: () => void;
    onClose: () => void;
}

/** Reusable "are you sure you want to delete?" dialog with a destructive confirm button. */
export default function ConfirmDeleteDialog({
    open,
    message,
    itemLabel,
    isDeleting = false,
    getString,
    onConfirm,
    onClose,
}: Props) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('confirmDelete')}</DialogTitle>
            <DialogContent>
                <DialogContentText>{message}</DialogContentText>
                {itemLabel && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 600 }}>
                        {itemLabel}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isDeleting}>
                    {getString('cancel')}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color="error"
                    disabled={isDeleting}
                    startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
                >
                    {isDeleting ? getString('deleting') : getString('delete')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
