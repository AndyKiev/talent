// src/components/admin/jobs/JobJobGroupsDialog.tsx

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
  Radio,
  RadioGroup,
  Typography,
  Box,
  Alert,
  Divider,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { fetchJobGroups, type JobGroup } from '../job_groups/jobGroupApi';
import { fetchJobGroupTypes, type JobGroupType } from '../job_group_types/jobGroupTypeApi';
import type { Job } from './jobApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';

interface SetJobGroupsVars {
  jobId: number;
  jobGroupIds: number[];
}

interface Props {
  job: Job | null;
  isPending: boolean;
  setJobGroupsMutation: UseMutationResult<unknown, Error, SetJobGroupsVars>;
  onClose: () => void;
}

// Inner component that mounts fresh each time the dialog opens (via key).
// This eliminates the need for any setState-in-effect calls: all derived
// state is either computed via useMemo or initialised once from props.
function DialogContent_({
                          job,
                          isPending,
                          setJobGroupsMutation,
                          onClose,
                          allGroups,
                          allTypes,
                          isLoading,
                          groupsError,
                        }: {
  job: Job;
  isPending: boolean;
  setJobGroupsMutation: UseMutationResult<unknown, Error, SetJobGroupsVars>;
  onClose: () => void;
  allGroups: JobGroup[];
  allTypes: JobGroupType[];
  isLoading: boolean;
  groupsError: Error | null;
}) {
  const getString = useString({ str });

  // Initialise selectedIds once from job.job_group_names + allGroups.
  // Because this component is re-mounted (via key) each time the dialog opens,
  // we never need to reset this with an effect.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    const names = new Set(job.job_group_names ?? []);
    return new Set(allGroups.filter((g) => names.has(g.name)).map((g) => g.id));
  });

  const [search, setSearch] = useState('');

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? allGroups.filter((g) => g.name.toLowerCase().includes(q)) : allGroups;
  }, [allGroups, search]);

  const groupsByType = useMemo(() => {
    const typeMap = new Map<number, JobGroupType>();
    for (const t of allTypes) typeMap.set(t.id, t);

    const sectionMap = new Map<number, { type: JobGroupType; groups: JobGroup[] }>();
    for (const g of filteredGroups) {
      const tid = g.job_group_type_id;
      if (!sectionMap.has(tid)) {
        const type: JobGroupType = typeMap.get(tid) ?? {
          id: tid,
          name: g.job_group_type_name ?? String(tid),
          key: String(tid),
          description: null,
          allow_multiple: g.allow_multiple ?? true,
          created_at: '',
          groups: [],
        };
        sectionMap.set(tid, { type, groups: [] });
      }
      sectionMap.get(tid)!.groups.push(g);
    }
    return [...sectionMap.values()];
  }, [allTypes, filteredGroups]);

  const handleCheckboxToggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRadioSelect = (typeId: number, groupId: number) => {
    const typeGroupIds = new Set(
        allGroups.filter((g) => g.job_group_type_id === typeId).map((g) => g.id),
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      typeGroupIds.forEach((id) => next.delete(id));
      next.add(groupId);
      return next;
    });
  };

  const handleRadioDeselect = (typeId: number) => {
    const typeGroupIds = allGroups
        .filter((g) => g.job_group_type_id === typeId)
        .map((g) => g.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      typeGroupIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleConfirm = () => {
    setJobGroupsMutation.mutate(
        { jobId: job.id, jobGroupIds: Array.from(selectedIds) },
        { onSuccess: onClose },
    );
  };

  return (
      <>
        {groupsError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {groupsError.message}
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
        ) : groupsByType.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              {getString('noGroupsFound') || 'No groups found.'}
            </Typography>
        ) : (
            groupsByType.map(({ type, groups }) => {
              const isMultiple = type.allow_multiple ?? true;
              const selectedInType = groups.find((g) => selectedIds.has(g.id));

              return (
                  <Box key={type.id} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {type.name}
                      </Typography>
                      {!isMultiple && (
                          <Chip
                              label={getString('singletonHint') || 'one per job'}
                              size="small"
                              color="warning"
                              variant="outlined"
                          />
                      )}
                    </Box>

                    {isMultiple ? (
                        <FormGroup sx={{ pl: 1 }}>
                          {groups.map((g) => (
                              <FormControlLabel
                                  key={g.id}
                                  control={
                                    <Checkbox
                                        size="small"
                                        checked={selectedIds.has(g.id)}
                                        onChange={() => handleCheckboxToggle(g.id)}
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
                    ) : (
                        <RadioGroup
                            sx={{ pl: 1 }}
                            value={selectedInType?.id ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') handleRadioDeselect(type.id);
                              else handleRadioSelect(type.id, Number(val));
                            }}
                        >
                          <FormControlLabel
                              value=""
                              control={<Radio size="small" disabled={isPending} />}
                              label={
                                <Typography variant="body2" color="text.secondary">
                                  {getString('none') || 'None'}
                                </Typography>
                              }
                          />
                          {groups.map((g) => (
                              <FormControlLabel
                                  key={g.id}
                                  value={String(g.id)}
                                  control={<Radio size="small" disabled={isPending} />}
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
                        </RadioGroup>
                    )}
                  </Box>
              );
            })
        )}

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
      </>
  );
}

// Outer shell — owns the queries and Dialog frame.
// Passes `key={job?.id}` to DialogContent_ so it remounts fresh on each open.
export function JobJobGroupsDialog({ job, isPending, setJobGroupsMutation, onClose }: Props) {
  const getString = useString({ str });
  const open = !!job;

  const {
    data: allGroups = [],
    isLoading: groupsLoading,
    error: groupsError,
  } = useQuery({
    queryKey: ['job_groups_dialog'],
    queryFn: fetchJobGroups,
    enabled: open,
  });

  const {
    data: allTypes = [],
    isLoading: typesLoading,
  } = useQuery({
    queryKey: ['job_group_types_dialog'],
    queryFn: fetchJobGroupTypes,
    enabled: open,
  });

  const isLoading = groupsLoading || typesLoading;

  return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {cfl(getString('assignJobGroups')) || 'Assign Job Groups'}
          {job && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {job.name}
              </Typography>
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {/* key={job?.id} remounts DialogContent_ each time a different job is opened,
            resetting search and selectedIds without any setState-in-effect calls */}
          {job && (
              <DialogContent_
                  key={job.id}
                  job={job}
                  isPending={isPending}
                  setJobGroupsMutation={setJobGroupsMutation}
                  onClose={onClose}
                  allGroups={allGroups}
                  allTypes={allTypes}
                  isLoading={isLoading}
                  groupsError={groupsError as Error | null}
              />
          )}
        </DialogContent>
      </Dialog>
  );
}