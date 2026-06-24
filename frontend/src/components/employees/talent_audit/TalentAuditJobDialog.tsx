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
  Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchJobsByDepartmentType,
  type JobWithLinkId,
} from '../../admin/department_types/departmentTypeJobLinkApi';
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';
import { createTalentAuditJob, type TalentAuditJobCreate } from './talentAuditApi';
import { DepartmentTypeSelectTree } from './DepartmentTypeSelectTree';
import { DEPT_TYPE_JOB_LINK_QK, TSPL_QK } from '../../../utils/queryKeys';
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

  // Department type chosen in the tree → drives the job select below.
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedTypeName, setSelectedTypeName] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { target_job_id: '', talent_status_period_link_id: '' },
  });

  // Reset everything when the dialog closes.
  useEffect(() => {
    if (!open) {
      reset({ target_job_id: '', talent_status_period_link_id: '' });
      setSelectedTypeId(null);
      setSelectedTypeName('');
      setErrorMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Jobs linked to the chosen department type (active links only).
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<JobWithLinkId[]>({
    queryKey: [...DEPT_TYPE_JOB_LINK_QK, 'by_type', selectedTypeId, true],
    queryFn: () => fetchJobsByDepartmentType(selectedTypeId as number, true),
    enabled: selectedTypeId != null,
    staleTime: 2 * 60 * 1000,
  });

  // Talent status + period pairs (the "talent level" select) — unchanged.
  const { data: pairs = [], isLoading: pairsLoading } = useQuery<StatusPeriodOption[]>({
    queryKey: [...TSPL_QK, 'active-pairs', true],
    queryFn: async () => {
      const res = await axiosInstance.get(
          `${BASE_URL}/talent_status_period_links/active-pairs?is_active=true`,
      );
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleSelectType = (typeId: number, typeName: string) => {
    setSelectedTypeId(typeId);
    setSelectedTypeName(typeName);
    // Clear any previously picked job — it may not belong to the new type.
    setValue('target_job_id', '');
  };

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

  return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{getString('addTalentAuditJob') || 'Add Job Assessment'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            {/* ── 1. Department type tree ───────────────────────────────── */}
            <Stack spacing={0.5}>
              <Typography variant="subtitle2">
                {getString('selectDepartmentType') || 'Select department type'}
              </Typography>
              <DepartmentTypeSelectTree
                  selectedTypeId={selectedTypeId}
                  onSelect={handleSelectType}
              />
            </Stack>

            {/* ── 2. Target job (filtered by the chosen type) ───────────── */}
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
                        disabled={selectedTypeId == null || jobsLoading}
                        error={!!errors.target_job_id}
                        helperText={
                          selectedTypeId == null
                              ? getString('selectTypeFirst') || 'Select a department type first'
                              : !jobsLoading && jobs.length === 0
                                  ? getString('noJobsForType') || 'No jobs linked to this department type'
                                  : errors.target_job_id
                                      ? getString('fieldRequired') || 'Required'
                                      : selectedTypeName
                                          ? `${getString('jobsFor') || 'Jobs for'}: ${selectedTypeName}`
                                          : ''
                        }
                    >
                      {jobs.map((j) => (
                          <MenuItem key={j.id} value={j.id}>
                            {j.name}
                          </MenuItem>
                      ))}
                    </TextField>
                )}
            />

            {/* ── 3. Talent status & period (talent level) ──────────────── */}
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
                        disabled={pairsLoading}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>
            {getString('cancel') || 'Cancel'}
          </Button>
          <Button
              variant="contained"
              onClick={handleSubmit(onSubmit)}
              disabled={mutation.isPending || pairsLoading}
          >
            {mutation.isPending ? <CircularProgress size={18} /> : getString('add') || 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
  );
}
