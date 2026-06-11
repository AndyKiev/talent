// components/Customized/Admin/Locale/LocaleAdminReduced.tsx
import React, { useState, useMemo } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';

// import type { TableTranslation, TranslationFormData } from './types';
import type { TableTranslation} from './translations.ts';
import { TranslationGrid } from './components/TranslationGrid.tsx';
import { HeaderActions } from './components/HeaderActions.tsx';
import { AddTranslationDialog } from './components/dialogs/AddTranslationDialog.tsx';
import { EditTranslationDialog } from './components/dialogs/EditTranslationDialog.tsx';
import { ExportExcelDialog } from './components/dialogs/ExportExcelDialog.tsx';
import { ExportJsonDialog } from './components/dialogs/ExportJsonDialog.tsx';
import { DeleteConfirmationDialog } from "./components/dialogs/DeleteConfirmationDialog.tsx";

import {useTableStore} from "../../../store/tableStore.ts";
import {useClipboard} from "../../../hooks/useClipboard.ts";
import {useTranslations} from "../../../hooks/useTranslations.ts";
import useString from "../../../hooks/useString.ts";
import type {TranslationFormData} from "./types.ts";
import {BulkActionsToolbar} from "./components/BulkActionsToolbar.tsx";
import {ImportJsonTextDialogOld} from "./components/dialogs/ImportJsonTextDialogOld.tsx";

export const LocaleAdminReduced: React.FC = () => {
    const tableName = "localeAdmin";
    const selectedRows = useTableStore(state => state.selectedRows);
    const setSelectedRow = useTableStore(state => state.setSelectedRow);

    const {
        translationsData,
        isLoading,
        error,
        addKeyMutation,
        updateStringMutation,
        deleteStringMutation,
        // uploadExcelMutation,
        downloadExcelMutation,
        downloadJsonMutation,
        uploadJsonMutation,
    } = useTranslations();
    const getString = useString();

    const [searchText, setSearchText] = useState('');
    const [exactSearch, setExactSearch] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isJsonTextDialogOpen, setIsJsonTextDialogOpen] = useState(false);
    const [isJsonExportDialogOpen, setIsJsonExportDialogOpen] = useState(false);
    const [jsonCustomFilename, setJsonCustomFilename] = useState('');
    const [useJsonCustomName, setUseJsonCustomName] = useState(false);
    const [customFilename, setCustomFilename] = useState('');
    const [useCustomName, setUseCustomName] = useState(false);
    const [editingTranslation, setEditingTranslation] = useState<TableTranslation | null>(null);
    const [deletingTranslation, setDeletingTranslation] = useState<TableTranslation | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    // Initialize the clipboard hook
    const { copyToClipboard } = useClipboard({
        onSuccess: (message) => {
            setSnackbar({
                open: true,
                message,
                severity: 'success'
            });
        },
        onError: (message) => {
            setSnackbar({
                open: true,
                message,
                severity: 'error'
            });
        },
        successMessage: getString('copiedToClipboard'),
        errorMessage: getString('copyFailed')
    });

    // Simplified copy to clipboard handler
    const handleCopyToClipboard = (text: string, successMessage: string) => {
        copyToClipboard(text, {
            successMessage,
            errorMessage: getString('copyFailed')
        });
    };

    // Transform data for Table
    const dataSource: TableTranslation[] = useMemo(() => {
        return (translationsData || []).map(item => {
            const row: TableTranslation = {
                id: item.id,
                key: item.name,
            };
            (item.msg || []).forEach(msg => {
                const langShortName = msg.lang_data.short_name;
                row[langShortName] = msg.value;
            });

            return row;
        });
    }, [translationsData]);

    // Filter data based on search with toggle option
    const filteredData = useMemo(() => {
        if (!searchText) return dataSource;

        const searchTextLower = searchText.toLowerCase();

        if (exactSearch) {
            // Exact search - match the exact key or translation value
            return dataSource.filter(item =>
                item.key.toLowerCase() === searchTextLower ||
                Object.values(item).some(value =>
                    typeof value === 'string' && value.toLowerCase() === searchTextLower
                )
            );
        } else {
            // Partial/inclusion search - match if contains
            return dataSource.filter(item =>
                item.key.toLowerCase().includes(searchTextLower) ||
                Object.values(item).some(value =>
                    typeof value === 'string' && value.toLowerCase().includes(searchTextLower)
                )
            );
        }
    }, [dataSource, searchText, exactSearch]);

    // Event handlers
    const handleRowClick = (translation: TableTranslation) => {
        setSelectedRow(tableName, translation.id, translation);
    };

    const handleEditClick = (translation: TableTranslation) => {
        setEditingTranslation(translation);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (translation: TableTranslation) => {
        setDeletingTranslation(translation);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingTranslation) return;

        try {
            await deleteStringMutation.mutateAsync(deletingTranslation.id);
            setSnackbar({ open: true, message: getString('translationDeletedSuccessfully'), severity: 'success' });
        } catch (error) {
            setSnackbar({ open: true, message: getString('failedToDeleteTranslation'), severity: 'error' });
        } finally {
            setIsDeleteDialogOpen(false);
            setDeletingTranslation(null);
        }
    };

    const handleDeleteDialogClose = () => {
        setIsDeleteDialogOpen(false);
        setDeletingTranslation(null);
    };

    const handleAddSubmit = async (data: TranslationFormData) => {
        try {
            const newKeyData = [{
                name: data.key,
                msg: data.translations.filter(t => t.value.trim() !== ''),
            }];

            await addKeyMutation.mutateAsync(newKeyData);
            setSnackbar({ open: true, message: getString('translationAddedSuccessfully'), severity: 'success' });
            setIsAddDialogOpen(false);
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || getString('failedToAddTranslation');
            setSnackbar({ open: true, message: errorMessage, severity: 'error' });
        }
    };

    const handleEditSubmit = async (data: TranslationFormData) => {
        if (!editingTranslation) return;

        try {
            const updateData = {
                name: data.key,
                msg: data.translations.filter(t => t.value.trim() !== ''),
            };

            await updateStringMutation.mutateAsync({
                msg_key_id: editingTranslation.id,
                ...updateData,
            });

            setSnackbar({ open: true, message: getString('translationUpdatedSuccessfully'), severity: 'success' });
            setIsEditDialogOpen(false);
            setEditingTranslation(null);
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || getString('failedToUpdateTranslation');
            setSnackbar({ open: true, message: errorMessage, severity: 'error' });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    // const handleJsonExportClick = () => {
    //     setUseJsonCustomName(false);
    //     setJsonCustomFilename('');
    //     setIsJsonExportDialogOpen(true);
    // };

    const handleJsonExportConfirm = async () => {
        try {
            const filename = useJsonCustomName && jsonCustomFilename ? jsonCustomFilename : undefined;
            await downloadJsonMutation.mutateAsync(filename);

            setSnackbar({
                open: true,
                message: getString('jsonExportedSuccessfully'),
                severity: 'success'
            });

        } catch (error: any) {
            setSnackbar({
                open: true,
                message: getString('jsonExportFailed', { errorMessage: error.message }),
                severity: 'error'
            });
        } finally {
            setIsJsonExportDialogOpen(false);
            setJsonCustomFilename('');
            setUseJsonCustomName(false);
        }
    };

    // const handleJsonImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    //     const file = event.target.files?.[0];
    //     if (!file) return;
    //
    //     if (!file.name.endsWith('.json')) {
    //         setSnackbar({
    //             open: true,
    //             message: getString('pleaseSelectAJsonFile'),
    //             severity: 'error'
    //         });
    //         event.target.value = '';
    //         return;
    //     }
    //
    //     try {
    //         const result = await uploadJsonMutation.mutateAsync(file);
    //
    //         setSnackbar({
    //             open: true,
    //             message: getString('jsonImportedSuccessfully', { successCount: (result as any).success_count }),
    //             severity: 'success'
    //         });
    //
    //     } catch (error: any) {
    //         const errorMessage = error.response?.data?.detail || error.message || getString('importFailed');
    //         setSnackbar({
    //             open: true,
    //             message: getString('jsonImportFailed', { errorMessage }),
    //             severity: 'error'
    //         });
    //     } finally {
    //         event.target.value = '';
    //     }
    // };

    const handleJsonTextImport = async (jsonText: string) => {
        try {
            // Create a Blob from the JSON text to simulate a file
            const blob = new Blob([jsonText], { type: 'application/json' });
            const file = new File([blob], 'imported_json.json', { type: 'application/json' });

            const result = await uploadJsonMutation.mutateAsync(file);

            setSnackbar({
                open: true,
                message: getString('jsonTextImportedSuccessfully', {
                    successCount: (result as any).success_count
                }),
                severity: 'success'
            });

        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || error.message || getString('importFailed');
            setSnackbar({
                open: true,
                message: getString('jsonImportFailed', { errorMessage }),
                severity: 'error'
            });
        }
    };

    const handleJsonExportDialogClose = () => {
        setIsJsonExportDialogOpen(false);
        setJsonCustomFilename('');
        setUseJsonCustomName(false);
    };
    //
    // const handleExportClick = () => {
    //     setUseCustomName(false);
    //     setCustomFilename('');
    //     setIsExportDialogOpen(true);
    // };

    const handleExportConfirm = async () => {
        try {
            const filename = useCustomName && customFilename ? customFilename : undefined;
            await downloadExcelMutation.mutateAsync(filename);

            setSnackbar({
                open: true,
                message: getString('excelExportedSuccessfully'),
                severity: 'success'
            });

        } catch (error: any) {
            setSnackbar({
                open: true,
                message: getString('exportFailed', { errorMessage: error.message }),
                severity: 'error'
            });
        } finally {
            setIsExportDialogOpen(false);
            setCustomFilename('');
            setUseCustomName(false);
        }
    };

    const handleExportDialogClose = () => {
        setIsExportDialogOpen(false);
        setCustomFilename('');
        setUseCustomName(false);
    };

    // const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    //     const file = event.target.files?.[0];
    //     if (!file) return;
    //
    //     if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    //         setSnackbar({
    //             open: true,
    //             message: getString('pleaseSelectAnExcelFile'),
    //             severity: 'error'
    //         });
    //         event.target.value = '';
    //         return;
    //     }
    //
    //     try {
    //         const result: any = await uploadExcelMutation.mutateAsync(file);
    //
    //         const errorCount = result.error_count ? `, ${result.error_count} ${getString('errors')}` : '';
    //         setSnackbar({
    //             open: true,
    //             message: getString('excelImportedSuccessfully', {
    //                 successCount: result.success_count,
    //                 errorCount: errorCount
    //             }),
    //             severity: 'success'
    //         });
    //
    //     } catch (error: any) {
    //         const errorMessage = error.response?.data?.detail || error.message || getString('importFailed');
    //         setSnackbar({
    //             open: true,
    //             message: getString('importFailed', { errorMessage }),
    //             severity: 'error'
    //         });
    //     } finally {
    //         event.target.value = '';
    //     }
    // };

    return (

        <Box sx={{ p: 1 }}>
            <Box  sx={{ p: 1 }}>
                {/* Header with Search and Actions - Always displayed */}
                <HeaderActions
                    searchText={searchText}
                    onSearchChange={setSearchText}
                    onAddClick={() => setIsAddDialogOpen(true)}
                    // onExportClick={handleExportClick}
                    // onJsonExportClick={handleJsonExportClick}
                    // onImportExcel={handleImportExcel}
                    // onImportJson={handleJsonImport}
                    // onImportJsonTextClick={() => setIsJsonTextDialogOpen(true)}
                    exactSearch={exactSearch}
                    onExactSearchChange={setExactSearch}
                />
                <BulkActionsToolbar/>

                {/* Error message displayed below header if there's an error */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {getString('errorLoadingTranslations', { errorMessage: (error as Error).message })}
                    </Alert>
                )}
            </Box>
            {/* Only show the grid when there's no error, otherwise show empty state */}
            <Box  sx={{ mb: 2 }}>
                {!error && (
                    <TranslationGrid
                        filteredData={filteredData}
                        selectedRows={selectedRows}
                        tableName={tableName}
                        isLoading={isLoading}
                        onRowClick={handleRowClick}
                        onEditClick={handleEditClick}
                        onDeleteClick={handleDeleteClick}
                        handleCopyToClipboard={handleCopyToClipboard}
                    />
                )}
            </Box>

            {/* Optionally show a message when there's an error */}
            {error && (
                <Alert severity="info" sx={{ mt: 2 }}>
                    {getString('pleaseFixTheErrorToViewAndEditTranslations')}
                </Alert>
            )}

            {/* Dialogs */}
            <AddTranslationDialog
                open={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                onSubmit={handleAddSubmit}
            />

            <EditTranslationDialog
                open={isEditDialogOpen}
                editingTranslation={editingTranslation}
                onClose={() => {
                    setIsEditDialogOpen(false);
                    setEditingTranslation(null);
                }}
                onSubmit={handleEditSubmit}
            />

            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                translationKey={deletingTranslation?.key || ''}
                onClose={handleDeleteDialogClose}
                onConfirm={handleDeleteConfirm}
                isDeleting={deleteStringMutation.isPending}
            />

            <ExportExcelDialog
                open={isExportDialogOpen}
                useCustomName={useCustomName}
                customFilename={customFilename}
                onClose={handleExportDialogClose}
                onConfirm={handleExportConfirm}
                onUseCustomNameChange={setUseCustomName}
                onCustomFilenameChange={setCustomFilename}
            />

            <ExportJsonDialog
                open={isJsonExportDialogOpen}
                useCustomName={useJsonCustomName}
                customFilename={jsonCustomFilename}
                onClose={handleJsonExportDialogClose}
                onConfirm={handleJsonExportConfirm}
                onUseCustomNameChange={setUseJsonCustomName}
                onCustomFilenameChange={setJsonCustomFilename}
            />

            <ImportJsonTextDialogOld
                open={isJsonTextDialogOpen}
                onClose={() => setIsJsonTextDialogOpen(false)}
                onConfirm={handleJsonTextImport}
            />

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default LocaleAdminReduced;