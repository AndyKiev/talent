// components/Customized/Admin/Locale/dialogs/ExportExcelDialog.tsx
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

interface ExportExcelDialogProps {
    open: boolean;
    useCustomName: boolean;
    customFilename: string;
    onClose: () => void;
    onConfirm: () => void;
    onUseCustomNameChange: (value: boolean) => void;
    onCustomFilenameChange: (value: string) => void;
}

export const ExportExcelDialog: React.FC<ExportExcelDialogProps> = ({
                                                                        open,
                                                                        useCustomName,
                                                                        customFilename,
                                                                        onClose,
                                                                        onConfirm,
                                                                        onUseCustomNameChange,
                                                                        onCustomFilenameChange,
                                                                    }) => {
    const getString = useString();
    const { downloadExcelMutation } = useTranslations();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {getString("exportTranslationsToExcel")}
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
                                            translations_export.xlsx
                                        </Typography>
                                    </Box>
                                }
                                disabled={downloadExcelMutation.isPending}
                            />
                            <FormControlLabel
                                value="custom"
                                control={<Radio />}
                                label={getString("useCustomFilename")}
                                disabled={downloadExcelMutation.isPending}
                            />
                        </RadioGroup>
                    </FormControl>

                    {useCustomName && (
                        <TextField
                            label={getString("customFilename")}
                            value={customFilename}
                            onChange={(e) => onCustomFilenameChange(e.target.value)}
                            placeholder="e.g., my_translations.xlsx"
                            helperText={getString("includeXlsxExtension")}
                            fullWidth
                            disabled={downloadExcelMutation.isPending}
                        />
                    )}

                    {downloadExcelMutation.isPending && (
                        <Alert severity="info" variant="outlined">
                            <Stack direction="row" spacing={2} alignItems="center">
                                <CircularProgress size={20} />
                                <Typography>{getString("preparingYourExcelFile")}</Typography>
                            </Stack>
                        </Alert>
                    )}

                    <Alert severity="info" variant="outlined">
                        {getString("excelExportDescription")}
                    </Alert>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={onClose}
                    disabled={downloadExcelMutation.isPending}
                >
                    {getString("cancel")}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    disabled={(useCustomName && !customFilename) || downloadExcelMutation.isPending}
                    startIcon={downloadExcelMutation.isPending ? <CircularProgress size={16} /> : <DownloadIcon />}
                >
                    {downloadExcelMutation.isPending ? getString("exporting") : getString("downloadExcel")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};