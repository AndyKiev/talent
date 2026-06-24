// src/components/admin/operations/OperationDeleteDialog.tsx
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import type { Operation } from './operationApi.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import cfl from '../../../../utils/helpers.ts';

interface Props {
  operation: Operation | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
  getString: GetStringFn;
}

export function OperationDeleteDialog({ operation, isPending, onConfirm, onClose, getString }: Props) {
  return (
    <Dialog open={!!operation} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{cfl(getString('deleteOperation')) || 'Delete Operation'}</DialogTitle>
      <DialogContent>
        <Typography>
          {getString('deleteConfirm') || 'Are you sure you want to delete'}{' '}
          <strong>{operation?.name}</strong>?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          {cfl(getString('cancel')) || 'Cancel'}
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={isPending}>
          {cfl(getString('delete')) || 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
