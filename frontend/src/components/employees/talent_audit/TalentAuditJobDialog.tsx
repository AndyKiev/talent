// src/components/employees/talent_audit/TalentAuditJobDialog.tsx
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  MenuItem,
  Stack,
  CircularProgress,
  Alert,
  TextField,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJobs, type Job } from '../../admin/jobs/jobApi';
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';
import { createTalentAuditJob, type TalentAuditJobCreate } from './talentAuditApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';


const DEFAULT_STATUS_ID = 1;

interface StatusPeriodOption {
  id: number;
  label: string;
}

interface FormValues {
  target_job_id: number | '';
  talent_status_period_link_id: number | '';
}

interface Props {
  open: boolean;
  talentAuditId: number;
  auditJobsQK: readonly unknown[];
  onClose: () => void;
  onSuccess: (detail: string) => void;
  // onError: (detail: string) => void;
}

export function TalentAuditJobDialog({
                                       open,
                                       talentAuditId,
                                       auditJobsQK,
                                       onClose,
                                       onSuccess,
                                     }: Props) {
  const getString = useString({ str });
  const qc = useQueryClient();
  const [errorMessage, setErrorMessage] = useState('');

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
    staleTime: 5 * 60 * 1000,
  });

  const { data: pairs = [], isLoading: pairsLoading } = useQuery<StatusPeriodOption[]>({
    queryKey: ['talent_status_period_links', 'active-pairs', true],
    queryFn: async () => {
      const res = await axiosInstance.get(
          `${BASE_URL}/talent_status_period_links/active_pairs?is_active=true`,
      );
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { target_job_id: '', talent_status_period_link_id: '' },
  });

  useEffect(() => {
    if (!open) {
      reset({ target_job_id: '', talent_status_period_link_id: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const mutation = useMutation({
    mutationFn: (body: TalentAuditJobCreate) => createTalentAuditJob(body),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: auditJobsQK });
      setErrorMessage('');
      onSuccess(res.detail);
      onClose();
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || getString('createFailed') || 'Failed to create');
    },
  });

  const onSubmit = (values: FormValues) => {
    setErrorMessage('');
    mutation.mutate({
      talent_audit_id: talentAuditId,
      target_job_id: values.target_job_id as number,
      status_id: DEFAULT_STATUS_ID,
      talent_status_period_link_id: values.talent_status_period_link_id as number,
    });
  };

  const loading = jobsLoading || pairsLoading;

  return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{getString('addTalentAuditJob') || 'Add Job Assessment'}</DialogTitle>
        <DialogContent>
          {loading ? (
              <CircularProgress size={24} sx={{ m: 2 }} />
          ) : (
              <Stack spacing={2} sx={{ mt: 1 }}>
                {errorMessage && (
                    <Alert severity="error">{errorMessage}</Alert>
                )}

                <Controller
                    name="target_job_id"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            select
                            fullWidth
                            label={getString('targetJob') || 'Target Job'}
                            error={!!errors.target_job_id}
                            helperText={errors.target_job_id ? getString('fieldRequired') || 'Required' : ''}
                        >
                          {jobs.map((j) => (
                              <MenuItem key={j.id} value={j.id}>
                                {j.name}
                              </MenuItem>
                          ))}
                        </TextField>
                    )}
                />

                <Controller
                    name="talent_status_period_link_id"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            select
                            fullWidth
                            label={getString('talentStatusPeriod') || 'Talent Status & Period'}
                            error={!!errors.talent_status_period_link_id}
                            helperText={
                              errors.talent_status_period_link_id
                                  ? getString('fieldRequired') || 'Required'
                                  : ''
                            }
                        >
                          {pairs.map((p) => (
                              <MenuItem key={p.id} value={p.id}>
                                {p.label}
                              </MenuItem>
                          ))}
                        </TextField>
                    )}
                />
              </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>
            {getString('cancel') || 'Cancel'}
          </Button>
          <Button
              variant="contained"
              onClick={handleSubmit(onSubmit)}
              disabled={mutation.isPending || loading}
          >
            {mutation.isPending ? <CircularProgress size={18} /> : getString('add') || 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
  );
}