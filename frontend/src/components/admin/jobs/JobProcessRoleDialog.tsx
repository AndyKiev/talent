// src/components/admin/jobs/JobProcessRoleDialog.tsx

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Box,
  Typography,
  Alert,
  Divider,
  Chip,
  Autocomplete,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { fetchProcesses, type Process } from '../../developer/process_roles/process/processApi';
import { fetchProcessRoles, type ProcessRole } from '../../developer/process_roles/process_role/processRoleApi';
import {
  fetchJobProcessRoleLinks,
  type JobProcessRoleLink,
} from './jobApi';
import type { Job } from './jobApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { JOB_PROCESS_ROLE_LINK_QK, PROCESS_QK, PROCESS_ROLE_QK } from '../../../utils/queryKeys';

interface AddLinkVars {
  job_id: number;
  process_role_id: number;
}

interface RemoveLinkVars {
  jobId: number;
  processRoleId: number;
}

interface Props {
  job: Job | null;
  addIsPending: boolean;
  removeIsPending: boolean;
  addLinkMutation: UseMutationResult<unknown, Error, AddLinkVars>;
  removeLinkMutation: UseMutationResult<unknown, Error, RemoveLinkVars>;
  onClose: () => void;
}

export function JobProcessRoleDialog({
  job,
  addIsPending,
  removeIsPending,
  addLinkMutation,
  removeLinkMutation,
  onClose,
}: Props) {
  const getString = useString({ str });
  const qc = useQueryClient();

  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  // ── Fetch processes ──────────────────────────────────────────────────────
  const { data: processes = [], isLoading: processesLoading } = useQuery({
    queryKey: PROCESS_QK,
    queryFn: () => fetchProcesses({ is_active: true }),
    staleTime: 2 * 60 * 1000,
  });

  // ── Fetch process roles filtered by selected process ─────────────────────
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: [...PROCESS_ROLE_QK, selectedProcessId] as const,
    queryFn: () =>
      fetchProcessRoles({ process_id: selectedProcessId ?? undefined, is_active: true }),
    enabled: selectedProcessId !== null,
    staleTime: 2 * 60 * 1000,
  });

  // ── Fetch existing links for this job ────────────────────────────────────
  const {
    data: existingLinks = [],
    isLoading: linksLoading,
    error: linksError,
  } = useQuery({
    queryKey: JOB_PROCESS_ROLE_LINK_QK(job?.id ?? 0),
    queryFn: () => fetchJobProcessRoleLinks(job!.id),
    enabled: job !== null,
  });

  const handleProcessChange = (_: unknown, value: Process | null) => {
    setSelectedProcessId(value?.id ?? null);
    setSelectedRoleId(null);
  };

  const handleRoleChange = (_: unknown, value: ProcessRole | null) => {
    setSelectedRoleId(value?.id ?? null);
  };

  const canAdd = selectedRoleId !== null && job !== null && !addIsPending;

  const handleAdd = () => {
    if (!canAdd || !job) return;
    addLinkMutation.mutate(
      { job_id: job.id, process_role_id: selectedRoleId! },
      {
        onSuccess: () => {
          setSelectedProcessId(null);
          setSelectedRoleId(null);
          qc.invalidateQueries({ queryKey: JOB_PROCESS_ROLE_LINK_QK(job.id) });
        },
      },
    );
  };

  const handleRemove = (link: JobProcessRoleLink) => {
    if (!job) return;
    removeLinkMutation.mutate(
      { jobId: job.id, processRoleId: link.process_role_id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: JOB_PROCESS_ROLE_LINK_QK(job.id) });
        },
      },
    );
  };

  return (
    <Dialog open={job !== null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {getString('processRolesForJob') || 'Process Roles'} — {job?.name ?? ''}
      </DialogTitle>

      <DialogContent>
        {linksError && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {(linksError as Error).message}
          </Alert>
        )}

        {/* ── Existing links ─────────────────────────────────────────────── */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {getString('assignedProcessRoles') || 'Assigned process roles'}
        </Typography>

        {linksLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : existingLinks.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {getString('noProcessRolesAssigned') || 'No process roles assigned.'}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            {existingLinks.map((link) => (
              <Chip
                key={link.id}
                label={`${link.process_name ?? '?'} / ${link.role_name ?? '?'}`}
                size="small"
                variant="outlined"
                color="primary"
                onDelete={removeIsPending ? undefined : () => handleRemove(link)}
                deleteIcon={removeIsPending ? undefined : <DeleteIcon fontSize="small" />}
              />
            ))}
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* ── Add new link ───────────────────────────────────────────────── */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {getString('addProcessRole') || 'Add process role'}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Autocomplete
            options={processes}
            getOptionLabel={(p) => p.name}
            value={processes.find((p) => p.id === selectedProcessId) ?? null}
            onChange={handleProcessChange}
            loading={processesLoading}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label={cfl(getString('process')) || 'Process'}
                size="small"
              />
            )}
          />

          <Autocomplete
            options={roles}
            getOptionLabel={(r) => r.name}
            value={roles.find((r) => r.id === selectedRoleId) ?? null}
            onChange={handleRoleChange}
            loading={rolesLoading}
            disabled={selectedProcessId === null}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label={cfl(getString('processRole')) || 'Process Role'}
                size="small"
              />
            )}
          />

          <Button
            variant="contained"
            size="small"
            startIcon={addIsPending ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
            disabled={!canAdd}
            onClick={handleAdd}
          >
            {getString('add') || 'Add'}
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={addIsPending || removeIsPending}>
          {getString('close') || 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
