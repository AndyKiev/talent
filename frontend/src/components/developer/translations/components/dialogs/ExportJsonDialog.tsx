// components/Customized/Admin/Locale/dialogs/ExportJsonDialog.tsx
import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    TextField,
    Alert,
    Typography,
    Box,
    CircularProgress,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import useString from "../../../../../hooks/useString";
import {useTranslations} from "../../../../../hooks/useTranslations.ts";

interface ExportJsonDialogProps {
    open: boolean;
    useCustomName: boolean;
    customFilename: string;
    onClose: () => void;
    onConfirm: () => void;
    onUseCustomNameChange: (value: boolean) => void;
    onCustomFilenameChange: (value: string) => void;
}

export const ExportJsonDialog: React.FC<ExportJsonDialogProps> = ({
                                                                      open,
                                                                      useCustomName,
                                                                      customFilename,
                                                                      onClose,
                                                                      onConfirm,
                                                                      onUseCustomNameChange,
                                                                      onCustomFilenameChange,
                                                                  }) => {
    const getString = useString();
    const { downloadJsonMutation } = useTranslations();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {getString("exportTranslationsToJson")}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <FormControl component="fieldset">
                        <FormLabel component="legend">{getString("filenameOptions")}</FormLabel>
                        <RadioGroup
                            value={useCustomName ? 'custom' : 'default'}
                            onChange={(e) => onUseCustomNameChange(e.target.value === 'custom')}
                        >
                            <FormControlLabel
                                value="default"
                                control={<Radio />}
                                label={
                                    <Box>
                                        <Typography variant="body1">{getString("useDefaultFilename")}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            translations_export.json
                                        </Typography>
                                    </Box>
                                }
                                disabled={downloadJsonMutation.isPending}
                            />
                            <FormControlLabel
                                value="custom"
                                control={<Radio />}
                                label={getString("useCustomFilename")}
                                disabled={downloadJsonMutation.isPending}
                            />
                        </RadioGroup>
                    </FormControl>

                    {useCustomName && (
                        <TextField
                            label={getString("customFilename")}
                            value={customFilename}
                            onChange={(e) => onCustomFilenameChange(e.target.value)}
                            placeholder="e.g., my_translations.json"
                            helperText={getString("includeJsonExtension")}
                            fullWidth
                            disabled={downloadJsonMutation.isPending}
                        />
                    )}

                    {downloadJsonMutation.isPending && (
                        <Alert severity="info" variant="outlined">
                            <Stack direction="row" spacing={2} alignItems="center">
                                <CircularProgress size={20} />
                                <Typography>{getString("preparingYourJsonFile")}</Typography>
                            </Stack>
                        </Alert>
                    )}

                    <Alert severity="info" variant="outlined">
                        {getString("jsonExportDescription")}
                    </Alert>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={onClose}
                    disabled={downloadJsonMutation.isPending}
                >
                    {getString("cancel")}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    disabled={(useCustomName && !customFilename) || downloadJsonMutation.isPending}
                    startIcon={downloadJsonMutation.isPending ? <CircularProgress size={16} /> : <DownloadIcon />}
                >
                    {downloadJsonMutation.isPending ? getString("exporting") : getString("downloadJson")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};