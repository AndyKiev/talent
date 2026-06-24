// src/components/employees/talent_audit/TalentPlusToggle.tsx
import { useState } from 'react';
import {
  FormControlLabel,
  Switch,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTalentAudit } from './talentAuditApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

interface Props {
  auditId: number;
  value: boolean;
  auditQK: readonly unknown[];
  onSuccess: (detail: string) => void;
  onError: (detail: string) => void;
}

export function TalentPlusToggle({
  auditId,
  value,
  auditQK,
  onSuccess,
  onError,
}: Props) {
  const getString = useString({ str });
  const qc = useQueryClient();
  // The value the user is asking to switch to (null = no dialog open).
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);

  const mutation = useMutation({
    mutationFn: (next: boolean) => updateTalentAudit(auditId, { talent_plus: next }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: auditQK });
      onSuccess(res.detail);
      setPendingValue(null);
    },
    onError: (err: Error) => {
      onError(err.message || getString('updateFailed') || 'Update failed');
      setPendingValue(null);
    },
  });

  const enabling = pendingValue === true;

  const handleConfirm = () => {
    if (pendingValue !== null) mutation.mutate(pendingValue);
  };

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1}>
        <FormControlLabel
          control={
            <Switch
              checked={value}
              disabled={mutation.isPending}
              onChange={(e) => setPendingValue(e.target.checked)}
            />
          }
          label={getString('talentPlus') || 'Talent +'}
        />
        {mutation.isPending && <CircularProgress size={16} />}
      </Stack>

      <Dialog
        open={pendingValue !== null}
        onClose={() => !mutation.isPending && setPendingValue(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {enabling
            ? getString('confirmTalentPlusEnable') || 'Enable Talent +?'
            : getString('confirmTalentPlusDisable') || 'Disable Talent +?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {enabling
              ? getString('confirmTalentPlusEnableMessage') ||
                'This will mark the employee as having additional talents (Talent +).'
              : getString('confirmTalentPlusDisableMessage') ||
                'This will remove the additional talents mark (Talent +) from the employee.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingValue(null)} disabled={mutation.isPending}>
            {getString('cancel') || 'Cancel'}
          </Button>
          <Button
            variant="contained"
            color={enabling ? 'primary' : 'warning'}
            onClick={handleConfirm}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <CircularProgress size={18} />
            ) : (
              getString('confirm') || 'Confirm'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
