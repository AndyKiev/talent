// src/components/admin/jobs/JobGroupsDialog.tsx
//
// Opens when the user clicks the Groups chip column.
// Shows all available UserGroups as checkboxes; on confirm fires PUT /jobs/{id}/groups.

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Alert,
  Divider,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { type Job} from './jobApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {fetchUserGroups, type UserGroup} from "../user_groups/userGroupApi.ts";
import {USER_GROUPS_QK} from "../../../utils/queryKeys.ts";

interface SetGroupsVars {
  jobId: number;
  groupIds: number[];
}

interface Props {
  job: Job | null;
  isPending: boolean;
  setGroupsMutation: UseMutationResult<Job, Error, SetGroupsVars>;
  onClose: () => void;
}

export function JobGroupsDialog({ job, isPending, setGroupsMutation, onClose }: Props) {
  const getString = useString({ str });

  const { data: allGroups = [], isLoading, error } = useQuery({
    queryKey: USER_GROUPS_QK,
    queryFn: fetchUserGroups,
    staleTime: 5 * 60 * 1000,
    enabled: !!job,
  });

  // IDs currently selected in the dialog (initialised from job.groups names → ids)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  // When job changes, sync selectedIds from group names → ids
  useEffect(() => {
    if (!job || allGroups.length === 0) return;
    const jobGroupNames = new Set(job.groups);
    const ids = allGroups
      .filter((g) => jobGroupNames.has(g.name))
      .map((g) => g.id);
    setSelectedIds(new Set(ids));
  }, [job, allGroups]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups.filter((g) => g.name.toLowerCase().includes(q));
  }, [allGroups, search]);

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!job) return;
    setGroupsMutation.mutate(
      { jobId: job.id, groupIds: Array.from(selectedIds) },
      { onSuccess: onClose },
    );
  };

  const open = !!job;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {cfl(getString('assignGroups')) || 'Assign Groups'}
        {job && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {job.name}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {(error as Error).message}
          </Alert>
        )}

        <TextField
          size="small"
          fullWidth
          placeholder={getString('search') || 'Search…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 1.5 }}
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

        <Divider sx={{ mb: 1 }} />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : filteredGroups.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            {getString('noGroupsFound') || 'No groups found.'}
          </Typography>
        ) : (
          <FormGroup>
            {filteredGroups.map((g: UserGroup) => (
              <FormControlLabel
                key={g.id}
                control={
                  <Checkbox
                    size="small"
                    checked={selectedIds.has(g.id)}
                    onChange={() => toggle(g.id)}
                    disabled={isPending}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">{g.name}</Typography>
                    {g.description && (
                      <Typography variant="caption" color="text.secondary">
                        {g.description}
                      </Typography>
                    )}
                  </Box>
                }
              />
            ))}
          </FormGroup>
        )}
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={onClose} disabled={isPending}>
          {getString('cancel') || 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={isPending || isLoading}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {getString('save') || 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
