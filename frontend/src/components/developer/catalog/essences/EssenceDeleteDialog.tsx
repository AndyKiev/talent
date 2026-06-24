// src/components/admin/essences/EssenceDeleteDialog.tsx
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import type { Essence } from './essenceApi.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import cfl from '../../../../utils/helpers.ts';

interface Props {
  essence: Essence | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
  getString: GetStringFn;
}

export function EssenceDeleteDialog({ essence, isPending, onConfirm, onClose, getString }: Props) {
  return (
    <Dialog open={!!essence} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{cfl(getString('deleteEssence')) || 'Delete Essence'}</DialogTitle>
      <DialogContent>
        <Typography>
          {getString('deleteConfirm') || 'Are you sure you want to delete'}{' '}
          <strong>{essence?.name}</strong>?
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
