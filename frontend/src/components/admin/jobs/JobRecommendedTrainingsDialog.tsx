// src/components/admin/jobs/JobRecommendedTrainingsDialog.tsx

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
import { useState, useMemo } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { fetchTrainingTypes } from '../../training/training_types/trainingTypeApi';
import type { Job } from './jobApi';
import { TRAINING_TYPE_QK } from '../../../utils/queryKeys.ts';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';

interface SetTrainingTypesVars {
  jobId: number;
  trainingTypeIds: number[];
}

interface Props {
  job: Job | null;
  isPending: boolean;
  setTrainingTypesMutation: UseMutationResult<unknown, Error, SetTrainingTypesVars>;
  onClose: () => void;
}

// Inner component that mounts fresh each time the dialog opens (via key),
// avoiding any setState-in-effect calls for resetting derived state.
function DialogContent_({
                          job,
                          isPending,
                          setTrainingTypesMutation,
                          onClose,
                          allTrainingTypes,
                          isLoading,
                          loadError,
                        }: {
  job: Job;
  isPending: boolean;
  setTrainingTypesMutation: UseMutationResult<unknown, Error, SetTrainingTypesVars>;
  onClose: () => void;
  allTrainingTypes: { id: number; name: string; description: string | null }[];
  isLoading: boolean;
  loadError: Error | null;
}) {
  const getString = useString({ str });

  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    const names = new Set(job.recommended_training_names ?? []);
    return new Set(allTrainingTypes.filter((t) => names.has(t.name)).map((t) => t.id));
  });

  const [search, setSearch] = useState('');

  const filteredTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? allTrainingTypes.filter((t) => t.name.toLowerCase().includes(q))
      : allTrainingTypes;
  }, [allTrainingTypes, search]);

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    setTrainingTypesMutation.mutate(
      { jobId: job.id, trainingTypeIds: Array.from(selectedIds) },
      { onSuccess: onClose },
    );
  };

  return (
    <>
      {loadError && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {loadError.message}
        </Alert>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {getString('byJobTrainingTypesHint') ||
          'Only trainings linked "by job" (not "by category" or "everyone") appear here.'}
      </Typography>

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
      ) : filteredTypes.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {allTrainingTypes.length === 0
            ? getString('noByJobTrainingTypesFound') ||
              'No "by job" training types exist yet. Only trainings linked by specific job (not "by job category" or "everyone") can be assigned here.'
            : getString('noTrainingTypesFound') || 'No training types found.'}
        </Typography>
      ) : (
        <FormGroup sx={{ pl: 1 }}>
          {filteredTypes.map((t) => (
            <FormControlLabel
              key={t.id}
              control={
                <Checkbox
                  size="small"
                  checked={selectedIds.has(t.id)}
                  onChange={() => handleToggle(t.id)}
                  disabled={isPending}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">{t.name}</Typography>
                  {t.description && (
                    <Typography variant="caption" color="text.secondary">
                      {t.description}
                    </Typography>
                  )}
                </Box>
              }
            />
          ))}
        </FormGroup>
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

// Outer shell — owns the query and Dialog frame.
// Passes `key={job?.id}` to DialogContent_ so it remounts fresh on each open.
export function JobRecommendedTrainingsDialog({ job, isPending, setTrainingTypesMutation, onClose }: Props) {
  const getString = useString({ str });
  const open = !!job;

  const {
    data: allTrainingTypes = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: TRAINING_TYPE_QK,
    queryFn: fetchTrainingTypes,
    enabled: open,
  });

  // Only "by_job" trainings are meaningful here — job_category/everyone
  // trainings never consult training_type_job_links in the eligibility
  // resolver, so offering them would create a dead, no-effect link.
  const byJobTrainingTypes = allTrainingTypes.filter(
    (t) => t.training_link_type_key === 'by_job',
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {cfl(getString('assignRecommendedTrainings')) || 'Assign Recommended Trainings'}
        {job && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {job.name}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {job && (
          <DialogContent_
            key={job.id}
            job={job}
            isPending={isPending}
            setTrainingTypesMutation={setTrainingTypesMutation}
            onClose={onClose}
            allTrainingTypes={byJobTrainingTypes}
            isLoading={isLoading}
            loadError={error as Error | null}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
