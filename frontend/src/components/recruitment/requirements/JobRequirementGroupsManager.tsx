import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    List,
    ListItemButton,
    Paper,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { JOB_REQUIREMENT_GROUPS_QK, RECRUITMENT_DIMENSIONS_QK } from '../../../utils/queryKeys';
import type { GetStringFn } from '../../../types/getStringFn';
import { JobRequirementItemsGrid } from './JobRequirementItemsGrid';
import {
    fetchJobRequirementGroups,
    fetchActiveRecruitmentDimensions,
    createJobRequirementGroup,
    updateJobRequirementGroup,
    deleteJobRequirementGroup,
    type JobRequirementGroup,
} from './jobRequirementApi';

interface Props {
    jobId: number;
    getString: GetStringFn;
}

/**
 * Shared editor for a job's requirement groups + their points. Reused by the
 * jobs-grid dialog and the recruitment task page. Only one group may be active
 * per job — the backend deactivates siblings when a group is activated.
 */
export function JobRequirementGroupsManager({ jobId, getString }: Props) {
    const qc = useQueryClient();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<JobRequirementGroup | null>(null);
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const showError = (message: string) => setSnackbar({ open: true, message, severity: 'error' });

    const { data: groups = [], isLoading, error } = useQuery({
        queryKey: JOB_REQUIREMENT_GROUPS_QK(jobId),
        queryFn: () => fetchJobRequirementGroups(jobId),
    });

    const { data: dimensions = [] } = useQuery({
        queryKey: RECRUITMENT_DIMENSIONS_QK,
        queryFn: fetchActiveRecruitmentDimensions,
        staleTime: 2 * 60 * 1000,
    });

    const sortedGroups = useMemo(() => [...groups].sort((a, b) => a.id - b.id), [groups]);

    // Effective selection is derived during render (no setState-in-effect): an
    // explicit pick wins while it still exists, otherwise fall back to the
    // active group, then the first one.
    const effectiveSelectedId =
        selectedId !== null && sortedGroups.some((g) => g.id === selectedId)
            ? selectedId
            : sortedGroups.find((g) => g.is_active)?.id ?? sortedGroups[0]?.id ?? null;

    const invalidateGroups = () => qc.invalidateQueries({ queryKey: JOB_REQUIREMENT_GROUPS_QK(jobId) });

    const createMutation = useMutation({
        mutationFn: createJobRequirementGroup,
        onSuccess: async (res) => {
            await invalidateGroups();
            setSelectedId(res.data.id);
            setFormOpen(false);
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => showError(err.message),
    });

    const updateMutation = useMutation({
        mutationFn: updateJobRequirementGroup,
        onSuccess: async (res) => {
            await invalidateGroups();
            setFormOpen(false);
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => showError(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteJobRequirementGroup,
        onSuccess: async (res) => {
            await invalidateGroups();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => showError(err.message),
    });

    const openCreate = () => {
        setEditing(null);
        setName('');
        setIsActive(sortedGroups.length === 0);
        setFormOpen(true);
    };
    const openEdit = (group: JobRequirementGroup) => {
        setEditing(group);
        setName(group.name);
        setIsActive(group.is_active);
        setFormOpen(true);
    };

    const handleSubmit = () => {
        if (!name.trim()) return;
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: { name: name.trim(), is_active: isActive } });
        } else {
            createMutation.mutate({ job_id: jobId, name: name.trim(), is_active: isActive });
        }
    };

    const toggleActive = (group: JobRequirementGroup) => {
        updateMutation.mutate({ id: group.id, data: { is_active: !group.is_active } });
    };

    const selectedGroup = sortedGroups.find((g) => g.id === effectiveSelectedId) ?? null;
    const formPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{(error as Error).message}</Alert>}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
                {/* Groups list */}
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', width: { xs: '100%', md: 300 }, flexShrink: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ flex: 1 }}>
                            {getString('jobRequirementGroups') || 'Requirement groups'}
                        </Typography>
                        <Button size="small" startIcon={<AddIcon />} onClick={openCreate}>
                            {getString('addRequirementGroup') || 'Add group'}
                        </Button>
                    </Box>
                    <Divider />
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress size={22} />
                        </Box>
                    ) : sortedGroups.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                            {getString('noRequirementGroups') || 'This job has no requirement groups yet'}
                        </Typography>
                    ) : (
                        <List dense disablePadding>
                            {sortedGroups.map((g) => (
                                <ListItemButton
                                    key={g.id}
                                    selected={g.id === effectiveSelectedId}
                                    onClick={() => setSelectedId(g.id)}
                                    sx={{ gap: 1 }}
                                >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" noWrap>
                                            {g.name}
                                        </Typography>
                                        {g.is_active && (
                                            <Chip
                                                label={getString('activeRequirementGroup') || 'Active'}
                                                size="small"
                                                color="success"
                                                sx={{ height: 18, mt: 0.25 }}
                                            />
                                        )}
                                    </Box>
                                    <Switch
                                        size="small"
                                        checked={g.is_active}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            toggleActive(g);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        disabled={updateMutation.isPending}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEdit(g);
                                        }}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteMutation.mutate(g.id);
                                        }}
                                        disabled={deleteMutation.isPending}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </ListItemButton>
                            ))}
                        </List>
                    )}
                </Paper>

                {/* Points of the selected group */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {selectedGroup ? (
                        <>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                {getString('requirementItems') || 'Requirement points'} — {selectedGroup.name}
                            </Typography>
                            <JobRequirementItemsGrid
                                key={selectedGroup.id}
                                groupId={selectedGroup.id}
                                jobId={jobId}
                                dimensions={dimensions}
                                getString={getString}
                                onError={showError}
                            />
                        </>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                            {getString('noRequirementGroups') || 'This job has no requirement groups yet'}
                        </Typography>
                    )}
                </Box>
            </Stack>

            {/* Group create/edit dialog */}
            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    {getString(editing ? 'editRequirementGroup' : 'addRequirementGroup') ||
                        (editing ? 'Edit group' : 'Add group')}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label={getString('requirementGroupName') || 'Group name'}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            fullWidth
                            required
                        />
                        <FormControlLabel
                            control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                            label={getString('activeRequirementGroup') || 'Active group'}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {getString('onlyOneActiveGroupPerJob') || 'Only one group can be active per job'}
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFormOpen(false)}>{getString('cancel') || 'Cancel'}</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={!name.trim() || formPending}>
                        {formPending ? getString('saving') || 'Saving…' : getString(editing ? 'save' : 'create') || 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

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
