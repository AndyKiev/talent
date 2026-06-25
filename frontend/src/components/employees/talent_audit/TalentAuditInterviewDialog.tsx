// src/components/employees/talent_audit/TalentAuditInterviewDialog.tsx
import { useEffect, useState, useMemo } from 'react';
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
  Divider,
  Box,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFreeAuditJobs,
  createTalentAuditInterview,
  type FreeAuditJob,
  type TalentAuditInterviewCreate,
} from './talentAuditApi';
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL, DATE_FORMAT } from '../../../utils/eNums';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

const DEFAULT_STATUS_ID = 1;

interface StatusPeriodOption {
  id: number;
  label: string;
  qty_months: number;
  status_key: string;
}

interface JobRow {
  talent_audit_job_id: number;
  job_name: string;
  hrm_status_period_label: string;
  hrm_qty_months: number;
  hrm_status_key: string;
  hrm_talent_status_period_link_id: number;
  talent_status_period_link_id: number | '';
}

interface FormValues {
  interview_date: string;
  jobs: JobRow[];
}

interface Props {
  open: boolean;
  talentAuditId: number;
  interviewsQK: readonly unknown[];
  auditJobsQK: readonly unknown[];
  onClose: () => void;
  onSuccess: (detail: string) => void;
  onError: (detail: string) => void;
}

export function TalentAuditInterviewDialog({
  open,
  talentAuditId,
  interviewsQK,
  auditJobsQK,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const getString = useString({ str });
  const qc = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);

  // Fetch free audit jobs (already sorted by qty_months from backend)
  const { data: freeJobs = [], isLoading: freeJobsLoading } = useQuery<FreeAuditJob[]>({
    queryKey: ['free_audit_jobs', talentAuditId],
    queryFn: () => fetchFreeAuditJobs(talentAuditId),
    enabled: open && !!talentAuditId,
  });

  // Fetch status+period pairs with qty_months for validation
  const { data: pairs = [], isLoading: pairsLoading } = useQuery<StatusPeriodOption[]>({
    queryKey: ['talent_status_period_links', 'active-pairs-with-months'],
    queryFn: async () => {
      const res = await axiosInstance.get(
        `${BASE_URL}/talent_status_period_links/active_pairs?is_active=true`,
      );
      return (res.data ?? []).map((p: { id: number; label: string; talent_period?: { qty_months?: number }; talent_status?: { key?: string } }) => ({
        id: p.id,
        label: p.label,
        qty_months: p.talent_period?.qty_months ?? 0,
        status_key: p.talent_status?.key ?? '',
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const pairsMap = useMemo(() => {
    const m = new Map<number, StatusPeriodOption>();
    for (const p of pairs) m.set(p.id, p);
    return m;
  }, [pairs]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { interview_date: '', jobs: [] },
  });

  const { fields } = useFieldArray({ control, name: 'jobs' });
  const watchedJobs = watch('jobs');

  // Populate job rows when free jobs load
  const freeJobsCount = freeJobs.length;
  useEffect(() => {
    if (open && freeJobsCount > 0) {
      reset({
        interview_date: '',
        jobs: freeJobs.map((fj) => ({
          talent_audit_job_id: fj.id,
          job_name: fj.job_name,
          hrm_status_period_label: fj.hrm_status_period_label,
          hrm_qty_months: fj.hrm_qty_months ?? 0,
          hrm_status_key: fj.hrm_status_key ?? '',
          hrm_talent_status_period_link_id: fj.hrm_talent_status_period_link_id ?? 0,
          talent_status_period_link_id: '',
        })),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, freeJobsCount]);


  useEffect(() => {
    if (!open) {
      reset({ interview_date: '', jobs: [] });
      setShowConfirmation(false);
      setPendingValues(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  // ── Validation helpers ──────────────────────────────────────────────────────

  const getValidationError = (): string | null => {
    if (!watchedJobs || watchedJobs.length === 0) return null;

    const months: number[] = [];
    for (const job of watchedJobs) {
      const linkId = job.talent_status_period_link_id;
      if (!linkId) continue;
      const pair = pairsMap.get(linkId as number);
      if (pair) months.push(pair.qty_months);
    }

    // Check duplicates
    if (new Set(months).size !== months.length) {
      return getString('talentAuditInterviewDuplicatePeriod') ||
        'Each job must have a different period (qty_months)';
    }

    // Check ascending
    for (let i = 1; i < months.length; i++) {
      if (months[i] <= months[i - 1]) {
        return getString('talentAuditInterviewPeriodsNotAscending') ||
          'Periods must be in ascending order (smaller qty_months first)';
      }
    }

    return null;
  };

  const getDiscrepancies = (values: FormValues): string[] => {
    const discrepancies: string[] = [];
    for (const job of values.jobs) {
      const hrsLinkId = job.talent_status_period_link_id as number;
      if (!hrsLinkId) continue;
      const hrsPair = pairsMap.get(hrsLinkId);
      if (!hrsPair) continue;

      const hrmQty = job.hrm_qty_months;
      const hrmStatusKey = job.hrm_status_key;
      const hrsQty = hrsPair.qty_months;
      const hrsStatusKey = hrsPair.status_key;

      if (hrsQty !== hrmQty || hrsStatusKey !== hrmStatusKey) {
        const details: string[] = [];
        if (hrsStatusKey !== hrmStatusKey) {
          details.push(
            `${getString('status') || 'status'}: ${hrmStatusKey} → ${hrsStatusKey}`
          );
        }
        if (hrsQty !== hrmQty) {
          details.push(
            `${getString('period') || 'period'}: ${hrmQty} → ${hrsQty} ${getString('months') || 'months'}`
          );
        }
        discrepancies.push(`${job.job_name}: ${details.join(', ')}`);
      }
    }
    return discrepancies;
  };

  const validationError = getValidationError();

  // ── Mutation ────────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: async (body: TalentAuditInterviewCreate) => createTalentAuditInterview(body),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: interviewsQK });
      await qc.invalidateQueries({ queryKey: auditJobsQK });
      await qc.invalidateQueries({ queryKey: ['free_audit_jobs', talentAuditId] });
      onSuccess(res.detail);
      onClose();
    },
    onError: (err: Error) => {
      const detail = err.message || getString('createFailed') || 'Failed to create interview';
      onError(detail);
    },
  });

  const doSubmit = (values: FormValues) => {
    mutation.mutate({
      talent_audit_id: talentAuditId,
      status_id: DEFAULT_STATUS_ID,
      interview_date: values.interview_date,
      job_assessments: values.jobs.map((j) => ({
        talent_audit_job_id: j.talent_audit_job_id,
        talent_status_period_link_id: j.talent_status_period_link_id as number,
      })),
    });
  };

  const onSubmit = (values: FormValues) => {
    const discrepancies = getDiscrepancies(values);
    if (discrepancies.length > 0) {
      setPendingValues(values);
      setShowConfirmation(true);
    } else {
      doSubmit(values);
    }
  };

  const handleConfirm = () => {
    if (pendingValues) {
      doSubmit(pendingValues);
    }
    setShowConfirmation(false);
    setPendingValues(null);
  };

  const handleCancelConfirm = () => {
    setShowConfirmation(false);
    setPendingValues(null);
  };

  const loading = freeJobsLoading || pairsLoading;
  const noFreeJobs = !loading && freeJobs.length === 0;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{getString('addInterview') || 'Add Interview'}</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {mutation.isError && (
                <Alert severity="error">
                  {getString('createFailed') || 'Failed to save'}
                </Alert>
              )}

              {noFreeJobs && (
                <Alert severity="info">
                  {getString('noFreeJobsForInterview') ||
                    "No available jobs with 'created' status for interview"}
                </Alert>
              )}

              {validationError && (
                <Alert severity="warning">{validationError}</Alert>
              )}

              {loading && <CircularProgress size={24} sx={{ alignSelf: 'center' }} />}

              {!loading && !noFreeJobs && (
                <>
                  {/* Interview date */}
                  <Controller
                    name="interview_date"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <DatePicker
                        label={getString('interviewDate') || 'Interview Date'}
                        format={DATE_FORMAT}
                        value={field.value ? dayjs(field.value) : null}
                        onChange={(v) => {
                          const d = v ? dayjs(v) : null;
                          field.onChange(d && d.isValid() ? d.format('YYYY-MM-DD') : '');
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!errors.interview_date,
                            helperText: errors.interview_date
                              ? getString('fieldRequired') || 'Required'
                              : '',
                          },
                        }}
                      />
                    )}
                  />

                  <Divider />

                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {getString('hrsStatusPeriod') || 'Status/Period (HRS)'} —{' '}
                    {getString('perJob') || 'per job'}
                  </Typography>

                  {fields.map((field, index) => (
                    <Box
                      key={field.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        {field.job_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        {getString('hrmStatusPeriod') || 'HRM'}: {field.hrm_status_period_label}
                      </Typography>

                      <Controller
                        name={`jobs.${index}.talent_status_period_link_id`}
                        control={control}
                        rules={{ required: true }}
                        render={({ field: selectField }) => (
                          <TextField
                            {...selectField}
                            select
                            fullWidth
                            size="small"
                            label={getString('hrsStatusPeriod') || 'HRS Status & Period'}
                            error={!!errors.jobs?.[index]?.talent_status_period_link_id}
                            helperText={
                              errors.jobs?.[index]?.talent_status_period_link_id
                                ? getString('fieldRequired') || 'Required'
                                : ''
                            }
                            sx={{ mt: 1 }}
                          >
                            {pairs.map((p) => (
                              <MenuItem key={p.id} value={p.id}>
                                {p.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        )}
                      />
                    </Box>
                  ))}
                </>
              )}
            </Stack>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>
            {getString('cancel') || 'Cancel'}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={mutation.isPending || loading || noFreeJobs || !!validationError}
          >
            {mutation.isPending ? <CircularProgress size={18} /> : getString('add') || 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Discrepancy confirmation dialog */}
      <Dialog open={showConfirmation} onClose={handleCancelConfirm} maxWidth="xs" fullWidth>
        <DialogTitle>
          {getString('confirmDiscrepancy') || 'Confirm Assessment Differences'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {getString('hrsDiscrepancyWarning') ||
              'The HRS assessment differs from the HRM assessment for the following jobs:'}
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {pendingValues && getDiscrepancies(pendingValues).map((d, i) => (
              <Typography key={i} variant="body2" fontWeight={500}>
                • {d}
              </Typography>
            ))}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {getString('confirmProceed') || 'Are you sure you want to proceed?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirm}>
            {getString('cancel') || 'Cancel'}
          </Button>
          <Button variant="contained" color="warning" onClick={handleConfirm}>
            {getString('confirm') || 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
