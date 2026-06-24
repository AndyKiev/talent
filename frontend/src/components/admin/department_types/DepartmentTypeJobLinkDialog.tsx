// src/components/admin/department_types/DepartmentTypeJobLinkDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    TextField,
    InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useState, useMemo } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { DepartmentType } from './departmentTypeApi';
import type {
    JobWithLinkId,
    DepartmentTypeJobLinkCreate,
    MutationResponse,
    DepartmentTypeJobLink,
} from './departmentTypeJobLinkApi';
import type { Job } from '../jobs/jobApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';

interface Props {
    open: boolean;
    /** The department type we are linking jobs to */
    departmentType: DepartmentType | null;
    /** Full flat list of all jobs (fetched by the parent panel) */
    allJobs: Job[];
    /** Already-linked jobs for this dept type (to exclude from the select) */
    existingLinkedJobs: JobWithLinkId[];
    createLinkMutation: UseMutationResult<
        MutationResponse<DepartmentTypeJobLink>,
        Error,
        DepartmentTypeJobLinkCreate
    >;
    onClose: () => void;
}

export function DepartmentTypeJobLinkDialog({
    open,
    departmentType,
    allJobs,
    existingLinkedJobs,
    createLinkMutation,
    onClose,
}: Props) {
    const getString = useString({ str });
    const [selectedJobId, setSelectedJobId] = useState<number | ''>('');
    const [search, setSearch] = useState('');

    const existingJobIds = new Set(existingLinkedJobs.map((j) => j.id));

    const available = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allJobs.filter(
            (j) => !existingJobIds.has(j.id) && (!q || j.name.toLowerCase().includes(q)),
        );
    }, [allJobs, existingJobIds, search]);

    const handleClose = () => {
        setSelectedJobId('');
        setSearch('');
        onClose();
    };

    const handleConfirm = () => {
        if (!departmentType || selectedJobId === '') return;
        createLinkMutation.mutate(
            { department_type_id: departmentType.id, job_id: selectedJobId as number },
            { onSuccess: handleClose },
        );
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                {cfl(getString('addJobToDepartmentType') || 'Link job to department type')}
            </DialogTitle>
            <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    {getString('departmentType') || 'Department type'}:{' '}
                    <strong>{departmentType?.name}</strong>
                </Typography>

                <TextField
                    size="small"
                    fullWidth
                    placeholder={getString('search') || 'Search…'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                />

                {available.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        {getString('noAvailableJobs') ||
                            'All jobs are already linked or no jobs match the search.'}
                    </Typography>
                ) : (
                    <FormControl fullWidth size="small">
                        <InputLabel>
                            {cfl(getString('job') || 'Job')}
                        </InputLabel>
                        <Select
                            value={selectedJobId}
                            label={cfl(getString('job') || 'Job')}
                            onChange={(e) => setSelectedJobId(e.target.value as number)}
                        >
                            {available.map((j) => (
                                <MenuItem key={j.id} value={j.id}>
                                    {j.name}
                                    {!j.is_active && (
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            color="text.disabled"
                                            sx={{ ml: 1 }}
                                        >
                                            ({getString('inactive') || 'inactive'})
                                        </Typography>
                                    )}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </DialogContent>
            <DialogActions>
                <Button
                    variant="outlined"
                    onClick={handleClose}
                    disabled={createLinkMutation.isPending}
                >
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={
                        selectedJobId === '' ||
                        available.length === 0 ||
                        createLinkMutation.isPending
                    }
                    startIcon={
                        createLinkMutation.isPending ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : undefined
                    }
                >
                    {getString('addLink') || 'Add link'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
