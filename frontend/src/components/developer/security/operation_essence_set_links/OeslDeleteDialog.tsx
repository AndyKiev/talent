// src/components/admin/operation_essence_set_links/OeslDeleteDialog.tsx
import { Typography } from '@mui/material';
import type { OESL } from './oeslApi.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import cfl from '../../../../utils/helpers.ts';
import ConfirmDeleteDialog from '../../../ui/ConfirmDeleteDialog';

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
  const hasGroupsWarning = (oesl?.user_group_names?.length ?? 0) > 0;

  return (
    <ConfirmDeleteDialog
      open={!!oesl}
      title={cfl(getString('deletePermission')) || 'Delete Permission'}
      message={
        <>{getString('deleteConfirm') || 'Are you sure you want to delete'} <strong>{oesl ? label(oesl) : ''}</strong>?</>
      }
      confirmLabel={cfl(getString('delete')) || 'Delete'}
      isDeleting={isPending}
      onConfirm={onConfirm}
      onClose={onClose}
      children={
        hasGroupsWarning ? (
          <Typography color="warning.main" variant="body2" sx={{ mt: 1 }}>
            {getString('oelDeleteWarning') || 'This will also revoke it from'}{' '}
            {oesl!.user_group_names.length}{' '}
            {getString('groups') || 'group(s)'}: {oesl!.user_group_names.join(', ')}
          </Typography>
        ) : undefined
      }
    />
  );
}
