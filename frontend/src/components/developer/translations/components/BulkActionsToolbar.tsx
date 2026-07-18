// components/Customized/Admin/Locale/BulkActionsToolbar.tsx
//
// Drop this inside your existing translations page toolbar.
// It manages all dialog state locally so the parent page stays clean.

import React, { useState } from 'react';
import {
    Stack,
    Button,
    Divider,
} from '@mui/material';
import {
    FileDownload as FileDownloadIcon,
    FileUpload as FileUploadIcon,
    TableChart as TableChartIcon,
    DataObject as DataObjectIcon,
    TextSnippet as TextSnippetIcon,
} from '@mui/icons-material';

import useString from '../../../../hooks/useString';

import { ExportJsonDialog } from './dialogs/ExportJsonDialog';
import { ExportExcelDialog } from './dialogs/ExportExcelDialog';
import { ImportFileDialog, ImportMode } from './dialogs/ImportFileDialog';
import { ImportJsonTextDialogNew } from './dialogs/ImportJsonTextDialogNew.tsx';
import type { ImportResult } from './dialogs/ImportJsonTextDialogNew.tsx';
import {useBulkTranslations} from "../useBulkTranslations.ts";

export const BulkActionsToolbar: React.FC = () => {
    const getString = useString();
    const {
        downloadJsonMutation,
        downloadExcelMutation,
        importJsonFileMutation,
        importJsonTextMutation,
        importExcelMutation,
    } = useBulkTranslations();

    // ── dialog open flags ──────────────────────────────────────────────────
    const [exportJsonOpen, setExportJsonOpen] = useState(false);
    const [exportExcelOpen, setExportExcelOpen] = useState(false);
    const [importJsonFileOpen, setImportJsonFileOpen] = useState(false);
    const [importJsonTextOpen, setImportJsonTextOpen] = useState(false);
    const [importExcelOpen, setImportExcelOpen] = useState(false);

    // ── shared export state ────────────────────────────────────────────────
    const [useCustomJsonName, setUseCustomJsonName] = useState(false);
    const [customJsonFilename, setCustomJsonFilename] = useState('');
    const [useCustomExcelName, setUseCustomExcelName] = useState(false);
    const [customExcelFilename, setCustomExcelFilename] = useState('');

    // ── import result state ────────────────────────────────────────────────
    const [jsonFileResult, setJsonFileResult] = useState<ImportResult | null>(null);
    const [jsonTextResult, setJsonTextResult] = useState<ImportResult | null>(null);
    const [excelResult, setExcelResult] = useState<ImportResult | null>(null);

    // ── handlers ───────────────────────────────────────────────────────────

    const handleExportJson = () => {
        downloadJsonMutation.mutate({ useCustomName: useCustomJsonName, customFilename: customJsonFilename });
    };

    const handleExportExcel = () => {
        downloadExcelMutation.mutate({ useCustomName: useCustomExcelName, customFilename: customExcelFilename });
    };

    const handleImportJsonFile = (file: File) => {
        setJsonFileResult(null);
        importJsonFileMutation.mutate(file, {
            onSuccess: (result) => setJsonFileResult(result),
        });
    };

    const handleImportJsonText = (text: string) => {
        setJsonTextResult(null);
        importJsonTextMutation.mutate(text, {
            onSuccess: (result) => setJsonTextResult(result),
        });
    };

    const handleImportExcel = (file: File) => {
        setExcelResult(null);
        importExcelMutation.mutate(file, {
            onSuccess: (result) => setExcelResult(result),
        });
    };

    return (
        <>
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                {/* Export */}
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<FileDownloadIcon />}
                    endIcon={<DataObjectIcon fontSize="small" />}
                    onClick={() => setExportJsonOpen(true)}
                >
                    {getString('exportJson')}
                </Button>

                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<FileDownloadIcon />}
                    endIcon={<TableChartIcon fontSize="small" />}
                    onClick={() => setExportExcelOpen(true)}
                >
                    {getString('exportExcel')}
                </Button>

                <Divider orientation="vertical" flexItem />

                {/* Import */}
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<FileUploadIcon />}
                    endIcon={<DataObjectIcon fontSize="small" />}
                    onClick={() => { setJsonFileResult(null); setImportJsonFileOpen(true); }}
                >
                    {getString('importJsonFile')}
                </Button>

                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<TextSnippetIcon />}
                    onClick={() => { setJsonTextResult(null); setImportJsonTextOpen(true); }}
                >
                    {getString('importJsonText')}
                </Button>

                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<FileUploadIcon />}
                    endIcon={<TableChartIcon fontSize="small" />}
                    onClick={() => { setExcelResult(null); setImportExcelOpen(true); }}
                >
                    {getString('importExcel')}
                </Button>
            </Stack>

            {/* ── Dialogs ─────────────────────────────────────────────────── */}

            <ExportJsonDialog
                open={exportJsonOpen}
                useCustomName={useCustomJsonName}
                customFilename={customJsonFilename}
                onClose={() => setExportJsonOpen(false)}
                onConfirm={handleExportJson}
                onUseCustomNameChange={setUseCustomJsonName}
                onCustomFilenameChange={setCustomJsonFilename}
            />

            <ExportExcelDialog
                open={exportExcelOpen}
                useCustomName={useCustomExcelName}
                customFilename={customExcelFilename}
                onClose={() => setExportExcelOpen(false)}
                onConfirm={handleExportExcel}
                onUseCustomNameChange={setUseCustomExcelName}
                onCustomFilenameChange={setCustomExcelFilename}
            />

            <ImportFileDialog
                open={importJsonFileOpen}
                mode={ImportMode.Json}
                isPending={importJsonFileMutation.isPending}
                result={jsonFileResult}
                onClose={() => setImportJsonFileOpen(false)}
                onConfirm={handleImportJsonFile}
            />

            <ImportJsonTextDialogNew
                open={importJsonTextOpen}
                isPending={importJsonTextMutation.isPending}
                result={jsonTextResult}
                onClose={() => setImportJsonTextOpen(false)}
                onConfirm={handleImportJsonText}
            />

            <ImportFileDialog
                open={importExcelOpen}
                mode={ImportMode.Excel}
                isPending={importExcelMutation.isPending}
                result={excelResult}
                onClose={() => setImportExcelOpen(false)}
                onConfirm={handleImportExcel}
            />
        </>
    );
};
