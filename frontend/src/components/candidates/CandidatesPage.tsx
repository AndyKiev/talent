import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import {
    Alert,
    Box,
    Breadcrumbs,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    CircularProgress,
    IconButton,
    Snackbar,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import useString from '../../hooks/useString';
import cfl from '../../utils/helpers.ts';
import { snakeToCamel } from '../../utils/helpers.ts';
import ConfirmDeleteDialog from '../people-review/ConfirmDeleteDialog';
import { CANDIDATE_QK } from '../../utils/queryKeys';
import { fetchCandidates, type Candidate } from './candidateApi';
import { useCandidateMutations } from './useCandidateMutations';
import { CandidateFormDialog } from './CandidateFormDialog';
import { PIPELINE_STATUS_COLOR, pipelineLabel } from './pipelineStatus';
import type { PipelineStatusKey } from './candidateApplicationApi';

export function CandidatesPage() {
    const getString = useString();
    const navigate = useNavigate();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [createOpen, setCreateOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Candidate | null>(null);

    const { data: candidates = [], isLoading, error } = useQuery({
        queryKey: CANDIDATE_QK,
        queryFn: fetchCandidates,
        staleTime: 30 * 1000,
    });

    const { createMutation, updateMutation, deleteMutation } = useCandidateMutations({
        setSnackbar,
        onCreateSuccess: () => setCreateOpen(false),
    });

    const sourceLabel = (key: string) => getString(snakeToCamel(key)) || key;

    return (
        <Box>
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography variant="body2" color="text.secondary">
                        {cfl(getString('home') || 'Home')}
                    </Typography>
                </Link>
                <Typography variant="body2" color="text.primary" fontWeight={600}>
                    {cfl(getString('candidates') || 'Candidates')}
                </Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('candidates') || 'Candidates'}
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                    {getString('createCandidate') || 'New candidate'}
                </Button>
            </Box>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {!isLoading && error && <Alert severity="error" sx={{ m: 2 }}>{(error as Error).message}</Alert>}

            {!isLoading && !error && candidates.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    {getString('noCandidatesYet') || 'No candidates yet.'}
                </Typography>
            )}

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 2,
                }}
            >
                {candidates.map((c) => {
                    const stage = c.furthest_stage as PipelineStatusKey | null;
                    return (
                        <Card key={c.id} variant="outlined" sx={{ position: 'relative' }}>
                            <CardActionArea
                                onClick={() =>
                                    navigate({ to: '/candidates/$candidateId', params: { candidateId: String(c.id) } })
                                }
                            >
                                <CardContent>
                                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                                        <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                                            {c.first_name} {c.last_name}
                                        </Typography>
                                        {stage && (
                                            <Chip
                                                size="small"
                                                label={pipelineLabel(stage, getString)}
                                                color={PIPELINE_STATUS_COLOR[stage]}
                                            />
                                        )}
                                    </Stack>
                                    {c.source && (
                                        <Chip
                                            size="small"
                                            variant="outlined"
                                            label={sourceLabel(c.source.key)}
                                            sx={{ mt: 0.5 }}
                                        />
                                    )}
                                    {c.email && (
                                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                                            <EmailIcon fontSize="inherit" color="disabled" />
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                {c.email}
                                            </Typography>
                                        </Stack>
                                    )}
                                    {c.phones.length > 0 && (
                                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                                            <PhoneIcon fontSize="inherit" color="disabled" />
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                {c.phones.map((p) => p.phone).join(', ')}
                                            </Typography>
                                        </Stack>
                                    )}
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                        {getString('applications') || 'Applications'}: {c.application_count}
                                    </Typography>
                                </CardContent>
                            </CardActionArea>
                            <Tooltip title={getString('delete') || 'Delete'}>
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => setPendingDelete(c)}
                                    sx={{ position: 'absolute', top: 4, right: 4 }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Card>
                    );
                })}
            </Box>

            <CandidateFormDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                createMutation={createMutation}
                updateMutation={updateMutation}
            />

            <ConfirmDeleteDialog
                open={pendingDelete !== null}
                message={getString('confirmDeleteMessage')}
                itemLabel={pendingDelete ? `${pendingDelete.first_name} ${pendingDelete.last_name}` : undefined}
                isDeleting={deleteMutation.isPending}
                getString={getString}
                onConfirm={() => {
                    if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
                    setPendingDelete(null);
                }}
                onClose={() => setPendingDelete(null)}
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
