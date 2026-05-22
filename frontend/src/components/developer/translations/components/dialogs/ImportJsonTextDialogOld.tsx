// components/Customized/Admin/Locale/dialogs/ImportJsonTextDialogOld.tsx
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
    Typography,
    Box,
    CircularProgress,
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { useTranslations } from '../../../../../hooks/useTranslations';
import useString from "../../../../../hooks/useString";

interface ImportJsonTextDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (jsonText: string) => Promise<void>;
}

export const ImportJsonTextDialogOld: React.FC<ImportJsonTextDialogProps> = ({
                                                                              open,
                                                                              onClose,
                                                                              onConfirm,
                                                                          }) => {
    const getString = useString();
    const { uploadJsonMutation } = useTranslations();
    const [jsonText, setJsonText] = useState('');
    const [jsonError, setJsonError] = useState('');

    const handleClose = () => {
        setJsonText('');
        setJsonError('');
        onClose();
    };

    const handleConfirm = async () => {
        // Validate JSON format
        try {
            if (!jsonText.trim()) {
                setJsonError(getString("invalidJsonFormat"));
                return;
            }

            const parsed = JSON.parse(jsonText);

            // Basic validation for the expected format
            if (typeof parsed !== 'object' || parsed === null) {
                setJsonError(getString("invalidJsonFormat"));
                return;
            }

            setJsonError('');
            await onConfirm(jsonText);
            handleClose();
        } catch (error) {
            setJsonError(getString("invalidJsonFormat"));
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {getString("importJsonFromText")}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        {getString("jsonTextImportDescription")}
                    </Alert>

                    <TextField
                        label={getString("jsonTextInput")}
                        value={jsonText}
                        onChange={(e) => {
                            setJsonText(e.target.value);
                            if (jsonError) setJsonError('');
                        }}
                        placeholder={getString("pasteJsonHere")}
                        multiline
                        rows={12}
                        fullWidth
                        error={!!jsonError}
                        helperText={jsonError}
                        disabled={uploadJsonMutation.isPending}
                    />

                    {uploadJsonMutation.isPending && (
                        <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <CircularProgress size={20} />
                                <Typography>{getString("processing")}</Typography>
                            </Box>
                        </Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={handleClose}
                    disabled={uploadJsonMutation.isPending}
                >
                    {getString("cancel")}
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!jsonText.trim() || uploadJsonMutation.isPending}
                    startIcon={uploadJsonMutation.isPending ? <CircularProgress size={16} /> : <UploadIcon />}
                >
                    {uploadJsonMutation.isPending ? getString("importing") : getString("import")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};