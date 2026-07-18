// src/components/admin/department_types/DepartmentTypeHierarchy.tsx
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    CircularProgress,
    InputAdornment,
    Paper,
    Snackbar,
    TextField,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

import { fetchDepartmentTypes, type DepartmentType } from './departmentTypeApi';
import { useDepartmentTypeMutations } from './useDepartmentTypeMutations';
import { useDepartmentTypeLinkMutations } from './useDepartmentTypeLinkMutations';
import { DepartmentTypeHierarchyRow } from './DepartmentTypeHierarchyRow';
import { FieldEditConfirmDialog, type PendingEdit } from '../../ui/FieldEditConfirmDialog';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import { DEPARTMENT_TYPE_QK } from '../../../utils/queryKeys.ts';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';

export function DepartmentTypeHierarchy() {
    const getString = useString({ str });

    const [filter, setFilter] = useState('');

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
    const [typeToDelete, setTypeToDelete] = useState<DepartmentType | null>(null);

    // ── All types (flat list, used as the source for link selects) ──────────
    const { data: allTypes = [], isLoading, error } = useQuery({
        queryKey: DEPARTMENT_TYPE_QK,
        queryFn: () => fetchDepartmentTypes(),
        staleTime: 2 * 60 * 1000,
    });

    // ── Type mutations (update / delete the type itself) ────────────────────
    const { updateMutation, deleteMutation } = useDepartmentTypeMutations({
        setSnackbar,
        onUpdateSuccess: () => setPendingEdit(null),
        onDeleteSuccess: () => setTypeToDelete(null),
        onDeleteError: () => setTypeToDelete(null),
    });

    // ── Link mutations (create / move / toggle / delete parental links) ─────
    const {
        createLinkMutation,
        updateLinkMutation,
        toggleLinkActiveMutation,
        deleteLinkMutation,
    } = useDepartmentTypeLinkMutations({ setSnackbar });

    // ── Filter the first parental level only (top-level rows) ───────────────
    // Children are fetched lazily per-row on expand and are intentionally
    // left unfiltered.
    const filteredTypes = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return allTypes;
        return allTypes.filter((t) => t.name.toLowerCase().includes(q));
    }, [allTypes, filter]);

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleToggleActive = useCallback(
        (type: DepartmentType) => {
            setPendingEdit({
                id: type.id,
                fieldLabel: getString('isActive') || 'Active',
                field: 'is_active',
                newValue: !type.is_active,
                oldValue: type.is_active,
            });
        },
        [getString],
    );

    const handleConfirmEdit = useCallback(() => {
        if (!pendingEdit) return;
        updateMutation.mutate({ id: pendingEdit.id, data: { [pendingEdit.field]: pendingEdit.newValue } });
    }, [pendingEdit, updateMutation]);

    const handleDeleteLink = useCallback(
        (linkId: number, parentId: number) => {
            deleteLinkMutation.mutate({ linkId, parentId });
        },
        [deleteLinkMutation],
    );

    const handleConfirmDelete = useCallback(() => {
        if (!typeToDelete) return;
        deleteMutation.mutate(typeToDelete.id);
    }, [typeToDelete, deleteMutation]);

    // ── Render ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                {(error as Error).message}
            </Alert>
        );
    }

    return (
        <Box>
            {/* ── Name filter (first level only) ──────────────────────────── */}
            <TextField
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={
                    getString('filterByDepartmentTypeName') || 'Filter by department type name…'
                }
                size="small"
                fullWidth
                sx={{ mb: 2 }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        </InputAdornment>
                    ),
                }}
            />

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                {allTypes.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            {getString('noDepartmentTypes') || 'No department types yet.'}
                        </Typography>
                    </Box>
                ) : filteredTypes.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            {getString('noMatchingDepartmentTypes') ||
                                'No department types match the filter.'}
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ py: 1 }}>
                        {filteredTypes.map((type) => (
                            <DepartmentTypeHierarchyRow
                                key={type.id}
                                type={type}
                                allTypes={allTypes}
                                depth={0}
                                updateIsPending={updateMutation.isPending}
                                deleteIsPending={deleteMutation.isPending}
                                deleteLinkIsPending={deleteLinkMutation.isPending}
                                createLinkMutation={createLinkMutation}
                                updateLinkMutation={updateLinkMutation}
                                toggleLinkActiveMutation={toggleLinkActiveMutation}
                                onToggleActive={handleToggleActive}
                                onDeleteClick={setTypeToDelete}
                                onRequestEdit={setPendingEdit}
                                onDeleteLink={handleDeleteLink}
                                setSnackbar={setSnackbar}
                            />
                        ))}
                    </Box>
                )}
            </Paper>

            {/* Confirmation dialogs */}
            <FieldEditConfirmDialog
                pending={pendingEdit}
                isPending={updateMutation.isPending}
                onConfirm={handleConfirmEdit}
                onCancel={() => setPendingEdit(null)}
            />

            <ConfirmDeleteDialog
                open={!!typeToDelete}
                title={getString('deleteDepartmentType') || 'Delete Department Type'}
                message={getString('areYouSureDeleteDepartmentType') || `Are you sure you want to delete "${typeToDelete?.name}"? This action cannot be undone.`}
                isDeleting={deleteMutation.isPending}
                onConfirm={handleConfirmDelete}
                onClose={() => setTypeToDelete(null)}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
