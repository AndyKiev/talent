// components/Customized/Admin/Locale/dialogs/ImportFileDialog.tsx
import React, { useRef, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    Alert,
    Typography,
    CircularProgress,
    Box,
    Collapse,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import { Upload as UploadIcon, ExpandMore, ExpandLess, AttachFile } from '@mui/icons-material';
import useString from '../../../../../hooks/useString';
import type { ImportResult } from './ImportJsonTextDialogNew.tsx';

interface ImportFileDialogProps {
    open: boolean;
    /** 'json' | 'excel' */
    mode: 'json' | 'excel';
    isPending: boolean;
    result: ImportResult | null;
    onClose: () => void;
    onConfirm: (file: File) => void;
}

export const ImportFileDialog: React.FC<ImportFileDialogProps> = ({
    open,
    mode,
    isPending,
    result,
    onClose,
    onConfirm,
}) => {
    const getString = useString();
    const inputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [errorsExpanded, setErrorsExpanded] = useState(false);

    const accept = mode === 'json' ? '.json' : '.xlsx';
    const titleKey = mode === 'json' ? 'importJsonFile' : 'importExcelFile';
    const descKey = mode === 'json' ? 'importJsonFileDescription' : 'importExcelFileDescription';

    const hasErrors = result && result.error_count > 0;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFile(e.target.files?.[0] ?? null);
    };

    const handleConfirm = () => {
        if (selectedFile) onConfirm(selectedFile);
    };

    const handleClose = () => {
        setSelectedFile(null);
        setErrorsExpanded(false);
        if (inputRef.current) inputRef.current.value = '';
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{getString(titleKey)}</DialogTitle>

            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Alert severity="info" variant="outlined">
                        {getString(descKey)}
                    </Alert>

                    <Box>
                        <input
                            ref={inputRef}
                            type="file"
                            accept={accept}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                        <Button
                            variant="outlined"
                            startIcon={<AttachFile />}
                            onClick={() => inputRef.current?.click()}
                            disabled={isPending}
                        >
                            {getString('chooseFile')}
                        </Button>

                        {selectedFile && (
                            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                                {selectedFile.name}
                            </Typography>
                        )}
                    </Box>

                    {isPending && (
                        <Alert severity="info" variant="outlined">
                            <Stack direction="row" spacing={2} alignItems="center">
                                <CircularProgress size={20} />
                                <Typography>{getString('importingTranslations')}</Typography>
                            </Stack>
                        </Alert>
                    )}

                    {result && (
                        <Alert severity={hasErrors ? 'warning' : 'success'} variant="outlined">
                            <Stack spacing={0.5}>
                                <Typography variant="body2">
                                    {getString('importResult', {
                                        success: result.success_count,
                                        total: result.total_processed,
                                    })}
                                </Typography>

                                {hasErrors && (
                                    <>
                                        <Box
                                            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mt: 0.5 }}
                                            onClick={() => setErrorsExpanded((v) => !v)}
                                        >
                                            <Typography variant="body2" color="warning.main">
                                                {getString('importErrors', { count: result.error_count })}
                                            </Typography>
                                            {errorsExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                        </Box>

                                        <Collapse in={errorsExpanded}>
                                            <List dense disablePadding>
                                                {result.errors?.map((err, i) => (
                                                    <ListItem key={i} disableGutters>
                                                        <ListItemText
                                                            primary={err}
                                                            primaryTypographyProps={{
                                                                variant: 'caption',
                                                                color: 'warning.main',
                                                                fontFamily: 'monospace',
                                                            }}
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Collapse>
                                    </>
                                )}
                            </Stack>
                        </Alert>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={isPending}>
                    {getString('close')}
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!selectedFile || isPending}
                    startIcon={isPending ? <CircularProgress size={16} /> : <UploadIcon />}
                >
                    {isPending ? getString('importing') : getString('upload')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
