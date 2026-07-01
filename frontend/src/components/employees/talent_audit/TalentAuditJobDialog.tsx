// src/components/employees/talent_audit/TalentAuditJobDialog.tsx
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTalentAuditJob, type TalentAuditJobCreate } from './talentAuditApi';
import { TalentTargetJobPicker } from './TalentTargetJobPicker';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';


const DEFAULT_STATUS_ID = 1;

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

  // Department type chosen in the tree → drives the job select.
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedTypeName, setSelectedTypeName] = useState('');
  const [targetJobId, setTargetJobId] = useState<number | ''>('');
  const [talentLinkId, setTalentLinkId] = useState<number | ''>('');
  const [submitted, setSubmitted] = useState(false);

  // Reset everything when the dialog closes.
  useEffect(() => {
    if (!open) {
      setSelectedTypeId(null);
      setSelectedTypeName('');
      setTargetJobId('');
      setTalentLinkId('');
      setSubmitted(false);
      setErrorMessage('');
    }
  }, [open]);

  const handleSelectType = (typeId: number, typeName: string) => {
    setSelectedTypeId(typeId);
    setSelectedTypeName(typeName);
    // Clear any previously picked job — it may not belong to the new type.
    setTargetJobId('');
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

  const onSubmit = () => {
    setSubmitted(true);
    if (targetJobId === '' || talentLinkId === '') return;
    setErrorMessage('');
    mutation.mutate({
      talent_audit_id: talentAuditId,
      target_job_id: targetJobId,
      status_id: DEFAULT_STATUS_ID,
      talent_status_period_link_id: talentLinkId,
    });
  };

  return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{getString('addTalentAuditJob') || 'Add Job Assessment'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            <TalentTargetJobPicker
                selectedTypeId={selectedTypeId}
                selectedTypeName={selectedTypeName}
                onSelectType={handleSelectType}
                targetJobId={targetJobId}
                onTargetJob={(id) => setTargetJobId(id)}
                talentLinkId={talentLinkId}
                onTalentLink={(id) => setTalentLinkId(id)}
                targetJobError={submitted && targetJobId === ''}
                talentLinkError={submitted && talentLinkId === ''}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>
            {getString('cancel') || 'Cancel'}
          </Button>
          <Button
              variant="contained"
              onClick={onSubmit}
              disabled={mutation.isPending}
          >
            {mutation.isPending ? <CircularProgress size={18} /> : getString('add') || 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
  );
}
