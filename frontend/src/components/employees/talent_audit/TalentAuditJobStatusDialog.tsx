// src/components/employees/talent_audit/TalentAuditJobStatusDialog.tsx
import { useEffect, useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTalentAuditJobStatuses,
  updateTalentAuditJobStatus,
} from './talentAuditApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

interface TalentAuditJobStatusDialogProps {
  open: boolean;
  auditJobId: number | null;
  currentStatusId: number | null;
  jobName?: string;
  // Query key of the audit-jobs list to invalidate on success.
  auditJobsQK: readonly unknown[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function TalentAuditJobStatusDialog({
  open,
  auditJobId,
  currentStatusId,
  jobName,
  auditJobsQK,
  onClose,
  onSuccess,
  onError,
}: TalentAuditJobStatusDialogProps) {
  const getString = useString({ str });
  const qc = useQueryClient();
  const [statusId, setStatusId] = useState<number | ''>('');

  const { data: statuses = [], isLoading: statusesLoading } = useQuery({
    queryKey: ['talent_audit_job_statuses'],
    queryFn: () => fetchTalentAuditJobStatuses(),
    enabled: open,
  });

  // Seed the select with the row's current status whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setStatusId(currentStatusId ?? '');
    }
  }, [open, currentStatusId]);

  const mutation = useMutation({
    mutationFn: () => updateTalentAuditJobStatus(auditJobId!, statusId as number),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: auditJobsQK });
      onSuccess(res.detail);
      onClose();
    },
    onError: (err: Error) => {
      onError(err.message || getString('updateFailed') || 'Update failed');
    },
  });

  const handleSelect = (e: SelectChangeEvent<number>) => {
    setStatusId(Number(e.target.value));
  };

  const canSave =
    auditJobId !== null &&
    statusId !== '' &&
    statusId !== currentStatusId &&
    !mutation.isPending;

  return (
    <Dialog open={open} onClose={() => !mutation.isPending && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>{getString('changeJobStatus') || 'Change Status'}</DialogTitle>
      <DialogContent>
        {jobName && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {jobName}
          </Typography>
        )}
        {statusesLoading ? (
          <CircularProgress size={20} />
        ) : (
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel id="taj-status-label">
              {getString('status') || 'Status'}
            </InputLabel>
            <Select
              labelId="taj-status-label"
              label={getString('status') || 'Status'}
              value={statusId === '' ? '' : (statusId as number)}
              onChange={handleSelect}
            >
              {statuses.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>
          {getString('cancel') || 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={() => mutation.mutate()}
          disabled={!canSave}
        >
          {mutation.isPending ? <CircularProgress size={18} /> : getString('save') || 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
