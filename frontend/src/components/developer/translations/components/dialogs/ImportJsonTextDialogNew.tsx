// components/Customized/Admin/Locale/dialogs/ImportJsonTextDialogNew.tsx
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    TextField,
    Alert,
    Typography,
    CircularProgress,
    Collapse,
    Box,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import { Upload as UploadIcon, ExpandMore, ExpandLess } from '@mui/icons-material';
import useString from '../../../../../hooks/useString';

export interface ImportResult {
    success_count: number;
    error_count: number;
    total_processed: number;
    errors?: string[] | null;
}

interface ImportJsonTextDialogProps {
    open: boolean;
    isPending: boolean;
    result: ImportResult | null;
    onClose: () => void;
    onConfirm: (text: string) => void;
}

export const ImportJsonTextDialogNew: React.FC<ImportJsonTextDialogProps> = ({
    open,
    isPending,
    result,
    onClose,
    onConfirm,
}) => {
    const getString = useString();
    const [text, setText] = useState('');
    const [parseError, setParseError] = useState<string | null>(null);
    const [errorsExpanded, setErrorsExpanded] = useState(false);

    const handleTextChange = (value: string) => {
        setText(value);
        if (parseError) setParseError(null);
    };

    const handleConfirm = () => {
        try {
            JSON.parse(text);
        } catch {
            setParseError(getString('invalidJsonText'));
            return;
        }
        onConfirm(text);
    };

    const handleClose = () => {
        setText('');
        setParseError(null);
        setErrorsExpanded(false);
        onClose();
    };

    const hasErrors = result && result.error_count > 0;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>{getString('importJsonText')}</DialogTitle>

            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Alert severity="info" variant="outlined">
                        {getString('importJsonTextDescription')}
                    </Alert>

                    <TextField
                        label={getString('pasteJsonHere')}
                        multiline
                        minRows={10}
                        maxRows={20}
                        value={text}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder={'{\n  "someKey": {\n    "ukr": "...",\n    "eng": "..."\n  }\n}'}
                        fullWidth
                        disabled={isPending}
                        error={!!parseError}
                        helperText={parseError ?? undefined}
                        inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
                    />

                    {isPending && (
                        <Alert severity="info" variant="outlined">
                            <Stack direction="row" spacing={2} alignItems="center">
                                <CircularProgress size={20} />
                                <Typography>{getString('importingTranslations')}</Typography>
                            </Stack>
                        </Alert>
                    )}

                    {result && (
                        <Alert
                            severity={hasErrors ? 'warning' : 'success'}
                            variant="outlined"
                        >
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
                                            {errorsExpanded ? (
                                                <ExpandLess fontSize="small" />
                                            ) : (
                                                <ExpandMore fontSize="small" />
                                            )}
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
                    disabled={!text.trim() || isPending}
                    startIcon={
                        isPending ? <CircularProgress size={16} /> : <UploadIcon />
                    }
                >
                    {isPending ? getString('importing') : getString('importJson')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
