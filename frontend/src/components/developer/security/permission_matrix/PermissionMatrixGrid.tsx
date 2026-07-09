// src/components/admin/permission_matrix/PermissionMatrixGrid.tsx
//
// BA permission matrix: rows = permissions (OESL), columns = user groups.
// Each cell is a checkbox = "this group holds this permission". The draft lives
// in a zustand store so it survives navigation. The 'dev' superadmin group is
// excluded (it bypasses all permission checks anyway). Each column header has a
// check/uncheck-all box that toggles every currently-visible permission.
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SyncIcon from '@mui/icons-material/Sync';

import {
  fetchOESLs,
  fetchUserGroups,
  fetchCurrentUser,
  buildMatrixExport,
  syncPermissionsFromRoutes,
  type OESL,
  type UserGroup,
} from './permissionMatrixApi';
import { applyPermissionMatrix } from '../operation_essence_set_links/oeslApi';

import { OESL_QK } from '../../../../utils/queryKeys';
import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';
import cfl, { snakeToCamel } from '../../../../utils/helpers.ts';
import { type MatrixDraft, usePermissionMatrixStore } from '../../../../store/permissionMatrixStore.ts';

const USER_GROUP_QK = ['user_groups'];
const CURRENT_USER_QK = ['current_user'];
const AUTHORISATION = 'authorisation';
// Superadmin groups — excluded from the grid; they bypass all checks (see
// backend BYPASS_GROUP_NAMES). Keep in sync with the backend constant.
const BYPASS_GROUP_NAMES = new Set(['dev']);
// Only these groups (or a bypass user) may flip the "authorisation only" switch.
const AUTH_TOGGLE_GROUPS = new Set(['admin', 'dev']);

const EMPTY = new Set<number>();

function permissionLabel(p: OESL): string {
  const names = p.essence_names.length ? p.essence_names.join(', ') : p.fingerprint;
  return `${p.operation_name} · {${names}}`;
}

function buildServerState(groups: UserGroup[]): MatrixDraft {
  const state: MatrixDraft = {};
  for (const g of groups) state[g.id] = new Set<number>(g.oesl_ids ?? []);
  return state;
}

function sameSet(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function PermissionMatrixGrid() {
  const getString = useString({ str });
  const qc = useQueryClient();

  // Display helpers (show values the way the user reads them).
  const opLabel = (name: string) => cfl(getString(snakeToCamel(name))) || cfl(name);
  const essenceLabel = (name: string) =>
    (getString(snakeToCamel(name)) || name).toLowerCase();

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const { data: permissions = [], isLoading: permsLoading } = useQuery({
    queryKey: OESL_QK,
    queryFn: fetchOESLs,
    staleTime: 60 * 1000,
  });
  const { data: allGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: USER_GROUP_QK,
    queryFn: fetchUserGroups,
    staleTime: 60 * 1000,
  });
  const { data: me } = useQuery({
    queryKey: CURRENT_USER_QK,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  const canToggleAuth = useMemo(
    () =>
      !!me &&
      (me.is_bypass ||
        me.groups.some((g) => AUTH_TOGGLE_GROUPS.has((g ?? '').toLowerCase()))),
    [me],
  );

  const [authOnly, setAuthOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [essenceFilter, setEssenceFilter] = useState('');
  const [essenceSort, setEssenceSort] = useState<'translation' | 'key'>('translation');

  // Draft lives in the store (survives navigation).
  const draft = usePermissionMatrixStore((s) => s.draft);
  const initialized = usePermissionMatrixStore((s) => s.initialized);
  const hydrate = usePermissionMatrixStore((s) => s.hydrate);
  const resetDraft = usePermissionMatrixStore((s) => s.reset);
  const toggle = usePermissionMatrixStore((s) => s.toggle);
  const setGroup = usePermissionMatrixStore((s) => s.setGroup);

  const syncMutation = useMutation({
    mutationFn: syncPermissionsFromRoutes,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: OESL_QK });
      const msg =
        getString('syncDone', {
          created: res.created,
          existing: res.existing,
          skipped: res.skipped.length,
        }) ||
        `Synced: ${res.created} new, ${res.existing} existing, ${res.skipped.length} skipped`;
      setSnackbar({ open: true, message: msg, severity: res.skipped.length ? 'error' : 'success' });
    },
    onError: (err) =>
      setSnackbar({
        open: true,
        message: (err as Error).message || (getString('syncFailed') || 'Sync failed'),
        severity: 'error',
      }),
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      const payload = buildMatrixExport(
        selectableGroups.map((g) => ({ id: g.id, name: g.name })),
        draft,
      );
      return applyPermissionMatrix(payload.groups, false);
    },
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: OESL_QK });
      await qc.invalidateQueries({ queryKey: USER_GROUP_QK });
      // After a successful apply, reset the draft to the new server state
      // (the next re-render will pick up the refreshed groups).
      const msg =
        getString('matrixApplied', {
          added: res.total_added,
          removed: res.total_removed,
        }) || `Applied: ${res.total_added} added, ${res.total_removed} removed`;
      setSnackbar({ open: true, message: msg, severity: 'success' });
    },
    onError: (err) =>
      setSnackbar({
        open: true,
        message: (err as Error).message || (getString('applyFailed') || 'Apply failed'),
        severity: 'error',
      }),
  });

  // Selectable groups = all groups minus superadmin/bypass groups.
  const selectableGroups = useMemo(
    () => allGroups.filter((g) => !BYPASS_GROUP_NAMES.has((g.name ?? '').toLowerCase())),
    [allGroups],
  );

  const serverState = useMemo(() => buildServerState(selectableGroups), [selectableGroups]);

  // Seed the store once, after groups have loaded.
  useEffect(() => {
    if (!initialized && selectableGroups.length) hydrate(serverState);
  }, [initialized, selectableGroups.length, serverState, hydrate]);

  const visibleGroups = useMemo(
    () =>
      authOnly
        ? selectableGroups.filter(
            (g) => (g.user_group_type_name ?? '').toLowerCase() === AUTHORISATION,
          )
        : selectableGroups,
    [selectableGroups, authOnly],
  );

  // Distinct operations / essences across all permissions, for the two filters.
  const distinctOperations = useMemo(
    () => Array.from(new Set(permissions.map((p) => p.operation_name))).sort(),
    [permissions],
  );
  const distinctEssences = useMemo(
    () =>
      Array.from(new Set(permissions.flatMap((p) => p.essence_names))).sort((a, b) => {
        const labelA = essenceSort === 'translation' ? essenceLabel(a) : a;
        const labelB = essenceSort === 'translation' ? essenceLabel(b) : b;
        return labelA.localeCompare(labelB);
      }),
    [permissions, essenceSort],
  );

  const visiblePermissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return permissions.filter((p) => {
      if (operationFilter && p.operation_name !== operationFilter) return false;
      if (essenceFilter && !p.essence_names.includes(essenceFilter)) return false;
      if (q && !permissionLabel(p).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [permissions, search, operationFilter, essenceFilter]);

  const changedGroupCount = useMemo(() => {
    let n = 0;
    for (const g of selectableGroups) {
      const cur = draft[g.id] ?? EMPTY;
      const srv = serverState[g.id] ?? EMPTY;
      if (!sameSet(cur, srv)) n += 1;
    }
    return n;
  }, [draft, serverState, selectableGroups]);

  // Column check/uncheck-all over the *currently visible* permissions.
  const columnState = (groupId: number) => {
    const set = draft[groupId] ?? EMPTY;
    let on = 0;
    for (const p of visiblePermissions) if (set.has(p.id)) on += 1;
    return {
      checked: visiblePermissions.length > 0 && on === visiblePermissions.length,
      indeterminate: on > 0 && on < visiblePermissions.length,
    };
  };

  const handleToggleColumn = (groupId: number) => {
    const set = new Set(draft[groupId] ?? []);
    const allOn = visiblePermissions.every((p) => set.has(p.id));
    for (const p of visiblePermissions) {
      if (allOn) set.delete(p.id);
      else set.add(p.id);
    }
    setGroup(groupId, Array.from(set));
  };

  const handleReset = () => resetDraft(serverState);

  const handleDownload = () => {
    const payload = buildMatrixExport(
      selectableGroups.map((g) => ({ id: g.id, name: g.name })),
      draft,
    );
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permission_matrix_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (permsLoading || groupsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const stickyCol = {
    position: 'sticky' as const,
    left: 0,
    zIndex: 2,
    backgroundColor: 'background.paper',
    borderRight: '1px solid',
    borderColor: 'divider',
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight={600}>
        {cfl(getString('permissionMatrix')) || 'Permission matrix'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        {getString('permissionMatrixHint') ||
          'Tick which groups hold each permission, then download the JSON to apply.'}
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 2, gap: 1 }}>
        <TextField
          size="small"
          label={cfl(getString('search')) || 'Search'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 260 }}
        />
        <Tooltip
          title={
            canToggleAuth
              ? ''
              : getString('adminOnlyToggle') || 'Only admin/dev can change this'
          }
        >
          <FormControlLabel
            control={
              <Switch
                checked={authOnly}
                disabled={!canToggleAuth}
                onChange={(e) => setAuthOnly(e.target.checked)}
              />
            }
            label={getString('authorisationOnly') || 'Authorisation groups only'}
          />
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={getString('syncFromCodeHint') || 'Create permission rows for every guarded endpoint'}>
          <span>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<SyncIcon />}
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {getString('syncFromCode') || 'Sync from code'}
            </Button>
          </span>
        </Tooltip>
        {changedGroupCount > 0 && (
          <Chip
            color="warning"
            size="small"
            label={
              getString('groupsChanged', { count: changedGroupCount }) ||
              `${changedGroupCount} group(s) changed`
            }
          />
        )}
        <Tooltip title={getString('resetChanges') || 'Reset'}>
          <span>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              disabled={changedGroupCount === 0}
            >
              {getString('resetChanges') || 'Reset'}
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={getString('applyMatrixHint') || 'Save all changes to the database'}>
          <span>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<CloudUploadIcon />}
              onClick={() => applyMutation.mutate()}
              disabled={changedGroupCount === 0 || applyMutation.isPending}
            >
              {getString('apply') || 'Apply'}
            </Button>
          </span>
        </Tooltip>
        <Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload}>
          {getString('downloadJson') || 'Download JSON'}
        </Button>
      </Stack>

      {/* Row filters — operation and essence, left-aligned just above the grid. */}
      <Stack direction="row" spacing={2} sx={{ mb: 1.5, gap: 1 }} flexWrap="wrap">
        <TextField
          select
          size="small"
          label={cfl(getString('operation')) || 'Operation'}
          value={operationFilter}
          onChange={(e) => setOperationFilter(e.target.value)}
          sx={{ width: 220 }}
        >
          <MenuItem value="">{cfl(getString('all')) || 'All'}</MenuItem>
          {distinctOperations.map((op) => (
            <MenuItem key={op} value={op}>
              {opLabel(op)}
            </MenuItem>
          ))}
        </TextField>
        <Autocomplete
          size="small"
          options={distinctEssences}
          value={essenceFilter || null}
          onChange={(_, v) => setEssenceFilter(v ?? '')}
          getOptionLabel={(e) => `${essenceLabel(e)} (${e})`}
          filterOptions={(opts, { inputValue }) => {
            const q = inputValue.trim().toLowerCase();
            if (!q) return opts;
            return opts.filter(
              (e) =>
                e.toLowerCase().includes(q) ||
                essenceLabel(e).toLowerCase().includes(q),
            );
          }}
          isOptionEqualToValue={(o, v) => o === v}
          renderOption={(props, e) => (
            <Box component="li" {...props} key={e}>
              <Typography variant="body2" noWrap>
                <Box component="span" sx={{ fontWeight: 500 }}>{essenceLabel(e)}</Box>
                <Box component="span" sx={{ color: 'text.secondary', ml: 0.75 }}>
                  ({e})
                </Box>
              </Typography>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label={cfl(getString('essence')) || 'Essence'}
              sx={{ width: 300 }}
            />
          )}
        />
        <ToggleButtonGroup
          size="small"
          value={essenceSort}
          exclusive
          onChange={(_, v) => v && setEssenceSort(v)}
          sx={{ height: 40 }}
        >
          <ToggleButton value="translation" sx={{ textTransform: 'none' }}>
            {getString('byTranslation') || 'A→Å'}
          </ToggleButton>
          <ToggleButton value="key" sx={{ textTransform: 'none' }}>
            {getString('byKey') || 'Key'}
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {visiblePermissions.length === 0 ? (
        <Typography color="text.secondary">
          {getString('noPermissions') || 'No permissions found. Use “Sync from code” to populate them.'}
        </Typography>
      ) : visibleGroups.length === 0 ? (
        <Typography color="text.secondary">{getString('noGroups') || 'No groups found.'}</Typography>
      ) : (
        <Box sx={{ overflow: 'auto', maxHeight: '70vh', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content' }}>
            <Box component="thead">
              <Box component="tr">
                <Box
                  component="th"
                  sx={{ ...stickyCol, top: 0, zIndex: 3, textAlign: 'left', p: 1, minWidth: 320, borderBottom: '1px solid', borderColor: 'divider' }}
                >
                  <Typography variant="caption" fontWeight={700}>
                    {cfl(getString('permission')) || 'Permission'}
                  </Typography>
                </Box>
                {visibleGroups.map((g) => {
                  const cs = columnState(g.id);
                  return (
                    <Box
                      component="th"
                      key={g.id}
                      sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        backgroundColor: 'background.paper',
                        p: 0.5,
                        minWidth: 96,
                        maxWidth: 140,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        verticalAlign: 'bottom',
                        textAlign: 'center',
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ display: 'block', whiteSpace: 'normal', lineHeight: 1.2 }}
                      >
                        {g.name}
                      </Typography>
                      <Tooltip title={getString('toggleColumn') || 'Check / uncheck all (visible rows)'}>
                        <Checkbox
                          size="small"
                          checked={cs.checked}
                          indeterminate={cs.indeterminate}
                          onChange={() => handleToggleColumn(g.id)}
                        />
                      </Tooltip>
                    </Box>
                  );
                })}
              </Box>
            </Box>
            <Box component="tbody">
              {visiblePermissions.map((p) => (
                <Box component="tr" key={p.id} sx={{ '&:hover td': { backgroundColor: 'action.hover' } }}>
                  <Box component="td" sx={{ ...stickyCol, p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                      <Chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        label={opLabel(p.operation_name)}
                      />
                      {p.essence_names.map((n) => (
                        <Chip key={n} size="small" variant="outlined" label={essenceLabel(n)} />
                      ))}
                    </Stack>
                  </Box>
                  {visibleGroups.map((g) => {
                    const checked = draft[g.id]?.has(p.id) ?? false;
                    return (
                      <Box
                        component="td"
                        key={g.id}
                        sx={{ textAlign: 'center', p: 0, borderBottom: '1px solid', borderColor: 'divider' }}
                      >
                        <Checkbox size="small" checked={checked} onChange={() => toggle(g.id, p.id)} />
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
