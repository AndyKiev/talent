// src/components/admin/department_types/DepartmentTypeJobLinkPanel.tsx
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
import { fetchDepartmentTypes } from './departmentTypeApi';
import { useDepartmentTypeJobLinkMutations } from './useDepartmentTypeJobLinkMutations';
import { DepartmentTypeJobLinkRow } from './DepartmentTypeJobLinkRow';
import { fetchJobs } from '../jobs/jobApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import {DEPARTMENT_TYPE_QK, JOB_QK} from "../../../utils/queryKeys.ts";

export function DepartmentTypeJobLinkPanel() {
    const getString = useString({ str });

    const [filter, setFilter] = useState('');

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    // ── All department types (roots) ─────────────────────────────────────────
    const {
        data: allTypes = [],
        isLoading: typesLoading,
        error: typesError,
    } = useQuery({
        queryKey: DEPARTMENT_TYPE_QK,
         queryFn: () => fetchDepartmentTypes(),
        staleTime: 2 * 60 * 1000,
    });

    // ── All jobs (for the link dialog select) ────────────────────────────────
    const {
        data: allJobs = [],
        isLoading: jobsLoading,
        error: jobsError,
    } = useQuery({
        queryKey: JOB_QK,
        queryFn: () => fetchJobs(),
        staleTime: 2 * 60 * 1000,
    });

    // ── Link mutations ───────────────────────────────────────────────────────
    const { createLinkMutation, updateLinkMutation, deleteLinkMutation } =
        useDepartmentTypeJobLinkMutations({ setSnackbar });

    // ── Filter by department type name ───────────────────────────────────────
    const filteredTypes = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return allTypes;
        return allTypes.filter((t) => t.name.toLowerCase().includes(q));
    }, [allTypes, filter]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleDeleteLink = useCallback(
        (linkId: number, departmentTypeId: number) => {
            deleteLinkMutation.mutate({ linkId, departmentTypeId });
        },
        [deleteLinkMutation],
    );

    const handleToggleLink = useCallback(
        (linkId: number, currentIsActive: boolean) => {
            updateLinkMutation.mutate({
                linkId,
                data: { is_active: !currentIsActive },
            });
        },
        [updateLinkMutation],
    );

    // ── Render ────────────────────────────────────────────────────────────────

    const isLoading = typesLoading || jobsLoading;
    const error = typesError || jobsError;

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
            {/* ── Name filter ─────────────────────────────────────────────── */}
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

            <Paper
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            >
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
                            <DepartmentTypeJobLinkRow
                                key={type.id}
                                type={type}
                                allJobs={allJobs}
                                createLinkMutation={createLinkMutation}
                                onDeleteLink={handleDeleteLink}
                                onToggleLink={handleToggleLink}
                                deleteLinkIsPending={deleteLinkMutation.isPending}
                                updateLinkIsPending={updateLinkMutation.isPending}
                            />
                        ))}
                    </Box>
                )}
            </Paper>

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
