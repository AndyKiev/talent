import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import useString from '../../hooks/useString';

interface Props {
    open: boolean;
    /** Already-resolved dialog title (e.g. getString('confirmToggleActiveTitle')). */
    title: string;
    /** Already-resolved confirmation message. */
    message: string;
    /** Already-resolved confirm-button label. Defaults to getString('continue'). */
    confirmLabel?: string;
    /** Confirm-button colour. Defaults to 'primary'. */
    confirmColor?: 'primary' | 'warning' | 'error' | 'success';
    isPending?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/**
 * Reusable generic confirmation dialog (Cancel / Confirm) for non-destructive
 * actions such as toggling is_active. For deletes use ConfirmDeleteDialog.
 */
export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel,
    confirmColor = 'primary',
    isPending = false,
    onConfirm,
    onClose,
}: Props) {
    const getString = useString();
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{message}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isPending}>
                    {getString('cancel')}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color={confirmColor}
                    disabled={isPending}
                    startIcon={isPending ? <CircularProgress size={16} /> : undefined}
                >
                    {confirmLabel ?? getString('continue')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
