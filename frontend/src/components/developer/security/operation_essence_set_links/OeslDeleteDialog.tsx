// src/components/admin/operation_essence_set_links/OeslDeleteDialog.tsx
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import type { OESL } from './oeslApi.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import cfl from '../../../../utils/helpers.ts';

interface Props {
  oesl: OESL | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
  getString: GetStringFn;
}

function label(o: OESL): string {
  const names = o.essence_names.length ? o.essence_names.join(', ') : o.fingerprint;
  return `${o.operation_name} · {${names}}`;
}

export function OeslDeleteDialog({ oesl, isPending, onConfirm, onClose, getString }: Props) {
  return (
    <Dialog open={!!oesl} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{cfl(getString('deletePermission')) || 'Delete Permission'}</DialogTitle>
      <DialogContent>
        <Typography>
          {getString('deleteConfirm') || 'Are you sure you want to delete'}{' '}
          <strong>{oesl ? label(oesl) : ''}</strong>?
        </Typography>
        {(oesl?.user_group_names?.length ?? 0) > 0 && (
          <Typography color="warning.main" variant="body2" sx={{ mt: 1 }}>
            {getString('oelDeleteWarning') || 'This will also revoke it from'}{' '}
            {oesl!.user_group_names.length}{' '}
            {getString('groups') || 'group(s)'}: {oesl!.user_group_names.join(', ')}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>{cfl(getString('cancel')) || 'Cancel'}</Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={isPending}>
          {cfl(getString('delete')) || 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
