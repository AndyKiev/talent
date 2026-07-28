// src/components/ui/ConfirmDeleteDialog.tsx
// Shared "are you sure you want to delete?" dialog with a destructive confirm
// button. Replaces the per-essence *DeleteDialog clones — the caller resolves
// the title/message strings (per-entity translation keys keep working) and may
// add extra warning content via children.
import type { ReactNode } from 'react';
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
import useString from '../../hooks/useString';

interface Props {
    open: boolean;
    /** Already-resolved dialog title; defaults to the generic "Confirm delete". */
    title?: ReactNode;
    /** Already-resolved confirmation message (e.g. getString('areYouSureDeleteX')). */
    message: ReactNode;
    /** Optional identifier of the record being removed, shown beneath the message. */
    itemLabel?: string;
    /** Extra content (cascade warnings etc.) rendered above the message. */
    children?: ReactNode;
    isDeleting?: boolean;
    /** Disable the confirm button (e.g. while a blocking condition holds). */
    confirmDisabled?: boolean;
    /** Already-resolved confirm label; defaults to "Delete" (scopes say "Remove"). */
    confirmLabel?: string;
    onConfirm: () => void;
    onClose: () => void;
}

export default function ConfirmDeleteDialog({
    open,
    title,
    message,
    itemLabel,
    children,
    isDeleting = false,
    confirmDisabled = false,
    confirmLabel,
    onConfirm,
    onClose,
}: Props) {
    const getString = useString();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{title ?? getString('confirmDelete')}</DialogTitle>
            <DialogContent>
                {children}
                <DialogContentText component="div">{message}</DialogContentText>
                {itemLabel && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 600 }}>
                        {itemLabel}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onClose} disabled={isDeleting}>
                    {getString('cancel')}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color="error"
                    disabled={isDeleting || confirmDisabled}
                    startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
                >
                    {isDeleting ? getString('deleting') : confirmLabel ?? getString('delete')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
