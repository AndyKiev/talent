// src/components/admin/talent-statuses/TalentStatusDeleteDialog.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import type { TalentStatus } from './talentStatusApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

interface Props {
  row: TalentStatus | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TalentStatusDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
  const getString = useString({ str });

  return (
    <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{getString('deleteTalentStatus') || 'Delete Talent Status'}</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          {getString('areYouSureDeleteTalentStatus') ||
            `Are you sure you want to delete "${row?.name}"? This action cannot be undone.`}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onCancel} disabled={isPending}>
          {getString('cancel') || 'Cancel'}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={isPending}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {getString('delete') || 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
