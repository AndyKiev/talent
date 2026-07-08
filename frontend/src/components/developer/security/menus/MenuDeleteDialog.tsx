// src/components/developer/security/menus/MenuDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    CircularProgress,
} from '@mui/material';
import type { MenuAdmin } from './menuAdminApi';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/helpers';

interface Props {
    row: MenuAdmin | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function MenuDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString();
    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{cfl(getString('deleteMenu')) || 'Delete Menu'}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {getString('menuDeleteConfirm', { key: row?.key ?? '' }) ||
                        `Delete menu "${row?.key ?? ''}"? This cannot be undone.`}
                </DialogContentText>
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
