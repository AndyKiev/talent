// src/components/admin/operation_essence_set_links/OeslGroupsDialog.tsx
//
// Edit which user groups hold ONE permission (the inverse of the matrix).
// Multi-select to add groups; deselect to remove. On save it diffs against the
// permission's current groups and issues per-group grant/revoke calls — the
// same UGOESL links the matrix manages, but processed for a single permission.
import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import {
  grantPermissionSetToGroup,
  revokePermissionSetFromGroup,
  type OESL,
} from './oeslApi.ts';
import type { UserGroup } from '../../../admin/user_groups/userGroupApi.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import cfl from '../../../../utils/helpers.ts';

interface Props {
  oesl: OESL | null;
  userGroups: UserGroup[];
  getString: GetStringFn;
  onClose: () => void;
  onSaved: () => void;
}

function label(o: OESL): string {
  const names = o.essence_names.length ? o.essence_names.join(', ') : o.fingerprint;
  return `${o.operation_name} · {${names}}`;
}

export function OeslGroupsDialog({ oesl, userGroups, getString, onClose, onSaved }: Props) {
  const nameToGroup = useMemo(() => {
    const m = new Map<string, UserGroup>();
    for (const g of userGroups) m.set(g.name, g);
    return m;
  }, [userGroups]);

  const [selected, setSelected] = useState<UserGroup[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!oesl) return;
    const current = oesl.user_group_names
      .map((n) => nameToGroup.get(n))
      .filter((g): g is UserGroup => Boolean(g));
    setSelected(current);
  }, [oesl, nameToGroup]);

  const handleSave = async () => {
    if (!oesl) return;
    const originalIds = new Set(
      oesl.user_group_names
        .map((n) => nameToGroup.get(n)?.id)
        .filter((id): id is number => id != null),
    );
    const targetIds = new Set(selected.map((g) => g.id));

    const toGrant = [...targetIds].filter((id) => !originalIds.has(id));
    const toRevoke = [...originalIds].filter((id) => !targetIds.has(id));

    setSaving(true);
    try {
      await Promise.all([
        ...toGrant.map((id) => grantPermissionSetToGroup(id, oesl.id)),
        ...toRevoke.map((id) => revokePermissionSetFromGroup(id, oesl.id)),
      ]);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!oesl} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {cfl(getString('editGroups')) || 'Edit groups'}
        {oesl ? ` — ${label(oesl)}` : ''}
      </DialogTitle>
      <DialogContent dividers>
        <Autocomplete
          multiple
          options={userGroups}
          value={selected}
          onChange={(_, v) => setSelected(v)}
          getOptionLabel={(g) => g.name}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(params) => (
            <TextField
              {...params}
              label={cfl(getString('userGroups')) || 'User groups'}
              placeholder={getString('addGroup') || 'Add group'}
            />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {cfl(getString('cancel')) || 'Cancel'}
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {cfl(getString('save')) || 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
