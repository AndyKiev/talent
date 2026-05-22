// components/Customized/Admin/Locale/dialogs/DeleteConfirmationDialog.tsx
import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import useString from "../../../../../hooks/useString";

interface DeleteConfirmationDialogProps {
    open: boolean;
    translationKey: string;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
                                                                                      open,
                                                                                      translationKey,
                                                                                      onClose,
                                                                                      onConfirm,
                                                                                      isDeleting,
                                                                                  }) => {
    const getString = useString();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {getString("confirmDelete")}
            </DialogTitle>
            <DialogContent>
                <Typography>
                    {getString("areYouSureYouWantToDeleteThisTranslation")}
                </Typography>
                {translationKey && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontFamily: 'monospace' }}>
                        {translationKey}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={onClose}
                    disabled={isDeleting}
                >
                    {getString("cancel")}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color="error"
                    disabled={isDeleting}
                    startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
                >
                    {isDeleting ? getString("deleting") : getString("delete")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};