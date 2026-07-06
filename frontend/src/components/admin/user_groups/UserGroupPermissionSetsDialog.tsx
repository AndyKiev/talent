// src/components/admin/user_groups/UserGroupPermissionSetsDialog.tsx
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchOESLs, setGroupPermissionSets, type OESL } from '../../developer/security/operation_essence_set_links/oeslApi';
import type { UserGroup } from './userGroupApi';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';
import {OESL_QK} from "../../../utils/queryKeys.ts";

const USER_GROUP_QK = ['user_groups'];

/** Readable label for a set-grain permission, e.g. 'delete · {talent_period, talent_status}' */
function oeslLabel(oesl: OESL): string {
  const names = oesl.essence_names.length
    ? oesl.essence_names.join(', ')
    : oesl.fingerprint;
  return `${oesl.operation_name} · {${names}}`;
}

interface Props {
  group: UserGroup | null;
  onClose: () => void;
  getString: GetStringFn;
}

export function UserGroupPermissionSetsDialog({ group, onClose, getString }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  // Initialise from the group's current oesl_ids.
  // Re-mounted via key={group?.id} in UserGroupCrud so this is always fresh.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(group?.oesl_ids ?? []),
  );

  const { data: allOesls = [], isLoading } = useQuery({
    queryKey: OESL_QK,
    queryFn: fetchOESLs,
    staleTime: 60 * 1000,
    enabled: !!group,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? allOesls.filter((o) => oeslLabel(o).toLowerCase().includes(q))
      : allOesls;
  }, [allOesls, search]);

  const saveMutation = useMutation({
    mutationFn: (ids: number[]) => setGroupPermissionSets(group!.id, ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_GROUP_QK });
      qc.invalidateQueries({ queryKey: OESL_QK });
      onClose();
    },
  });

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!group) return null;

  const selectedOesls = allOesls.filter((o) => selectedIds.has(o.id));

  return (
    <Dialog open={!!group} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {cfl(getString('permissions')) || 'Permissions'} —{' '}
        <strong>{group.name}</strong>
      </DialogTitle>

      <DialogContent>
        {/* Selected chips */}
        {selectedOesls.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            {selectedOesls.map((o) => (
              <Chip
                key={o.id}
                label={oeslLabel(o)}
                size="small"
                color="primary"
                variant="outlined"
                onDelete={() => toggle(o.id)}
              />
            ))}
          </Box>
        )}

        {/* Search */}
        <TextField
          size="small"
          fullWidth
          placeholder={getString('search') || 'Search…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {/* Checklist */}
        {isLoading ? (
          <CircularProgress size={24} />
        ) : (
          <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {getString('noResults') || 'No results'}
              </Typography>
            )}
            {filtered.map((oesl) => (
              <FormControlLabel
                key={oesl.id}
                control={
                  <Checkbox
                    size="small"
                    checked={selectedIds.has(oesl.id)}
                    onChange={() => toggle(oesl.id)}
                  />
                }
                label={<Typography variant="body2">{oeslLabel(oesl)}</Typography>}
                sx={{ display: 'flex', mx: 0 }}
              />
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saveMutation.isPending}>
          {cfl(getString('cancel')) || 'Cancel'}
        </Button>
        <Button
          variant="contained"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate([...selectedIds])}
        >
          {cfl(getString('save')) || 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
