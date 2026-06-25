// src/components/admin/operation_essence_set_links/OeslCrud.tsx
import {useMemo, useRef, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {DataGrid, type GridColDef, type GridRenderCellParams} from '@mui/x-data-grid';
import {
  createOESL,
  deleteOESL,
  fetchOESLs,
  applyPermissionMatrix,
  revokePermissionSetFromGroup,
  type OESL,
  type MatrixGroupGrants,
  type MatrixApplyResult,
} from './oeslApi.ts';
import {fetchUserGroups, type UserGroup} from '../../../admin/user_groups/userGroupApi.ts';
import {OeslGroupsDialog} from './OeslGroupsDialog.tsx';
import {fetchOperations} from '../../catalog/operations/operationApi.ts';
import {fetchEssences} from '../../catalog/essences/essenceApi.ts';
import {OeslForm} from './OeslForm.tsx';
import {OeslDeleteDialog} from './OeslDeleteDialog.tsx';
import {useDataGridLocale} from '../../../../hooks/useDataGridLocale.ts';
import useString from '../../../../hooks/useString.ts';
import str from '../../../../strings/str.ts';
import cfl, { snakeToCamel } from '../../../../utils/helpers.ts';
import {ESSENCE_QK, OESL_QK, OPERATION_QK} from "../../../../utils/queryKeys.ts";

export function OeslCrud() {
  const getString = useString({ str });
  const qc = useQueryClient();
  const locale = useDataGridLocale();

  // Show operation/essence values the way the user reads them (translated).
  const opLabel = (name: string) => cfl(getString(snakeToCamel(name))) || cfl(name);
  const essenceLabel = (name: string) =>
    (getString(snakeToCamel(name)) || name).toLowerCase();

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [formOpen, setFormOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<OESL | null>(null);
  const [rowToEditGroups, setRowToEditGroups] = useState<OESL | null>(null);
  const [filterOperation, setFilterOperation] = useState('');
  const [filterEssence, setFilterEssence] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  // Upload-from-JSON (BA matrix) state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [applyGroups, setApplyGroups] = useState<MatrixGroupGrants[] | null>(null);
  const [preview, setPreview] = useState<MatrixApplyResult | null>(null);

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: OESL_QK,
    queryFn: fetchOESLs,
    staleTime: 60 * 1000,
  });
  const { data: operations = [] } = useQuery({
    queryKey: OPERATION_QK, queryFn: fetchOperations, staleTime: 5 * 60 * 1000,
  });
  const { data: essences = [] } = useQuery({
    queryKey: ESSENCE_QK, queryFn: fetchEssences, staleTime: 5 * 60 * 1000,
  });
  const { data: userGroups = [] } = useQuery({
    queryKey: ['user_groups'], queryFn: fetchUserGroups, staleTime: 60 * 1000,
  });

  const nameToGroupId = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of userGroups as UserGroup[]) m.set(g.name, g.id);
    return m;
  }, [userGroups]);

  const rows = useMemo(() => allRows.filter((r) => {
    if (filterOperation && r.operation_name !== filterOperation) return false;
    return !(filterEssence && !r.essence_names.includes(filterEssence));
  }), [allRows, filterOperation, filterEssence]);

  const createMutation = useMutation({
    mutationFn: createOESL,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: OESL_QK });
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      setFormOpen(false);
    },
    onError: (err) => setSnackbar({ open: true, message: (err as Error).message || 'Error creating permission', severity: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOESL,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: OESL_QK });
      await qc.invalidateQueries({ queryKey: ['user_groups'] });
      setSnackbar({ open: true, message: 'Permission deleted', severity: 'success' });
      setRowToDelete(null);
    },
    onError: (err) => setSnackbar({ open: true, message: (err as Error).message || 'Error deleting permission', severity: 'error' }),
  });

  // Quick-revoke one group from a permission (the chip's delete button).
  const revokeGroupMutation = useMutation({
    mutationFn: ({ oeslId, groupId }: { oeslId: number; groupId: number }) =>
      revokePermissionSetFromGroup(groupId, oeslId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: OESL_QK });
      await qc.invalidateQueries({ queryKey: ['user_groups'] });
    },
    onError: (err) =>
      setSnackbar({ open: true, message: (err as Error).message || 'Error revoking group', severity: 'error' }),
  });

  // Step 1: parse the uploaded file and dry-run it to get a preview diff.
  const dryRunMutation = useMutation({
    mutationFn: (groups: MatrixGroupGrants[]) => applyPermissionMatrix(groups, true),
    onSuccess: (res) => setPreview(res),
    onError: (err) => {
      setApplyGroups(null);
      setSnackbar({ open: true, message: (err as Error).message || 'Invalid matrix file', severity: 'error' });
    },
  });

  // Step 2: commit (full-replace each group's grants).
  const commitMutation = useMutation({
    mutationFn: (groups: MatrixGroupGrants[]) => applyPermissionMatrix(groups, false),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['user_groups'] });
      await qc.invalidateQueries({ queryKey: OESL_QK });
      setSnackbar({
        open: true,
        message:
          getString('applyDone', { added: res.total_added, removed: res.total_removed }) ||
          `Applied: +${res.total_added} granted, −${res.total_removed} revoked`,
        severity: 'success',
      });
      setPreview(null);
      setApplyGroups(null);
    },
    onError: (err) => setSnackbar({ open: true, message: (err as Error).message || 'Apply failed', severity: 'error' }),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-uploading the same filename
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const groups: MatrixGroupGrants[] = Array.isArray(parsed) ? parsed : parsed.groups;
      if (!Array.isArray(groups)) throw new Error('Expected a { groups: [...] } object');
      setApplyGroups(groups);
      dryRunMutation.mutate(groups);
    } catch (err) {
      setSnackbar({ open: true, message: (err as Error).message || 'Could not read JSON', severity: 'error' });
    }
  };

  const changedGroups = useMemo(
    () =>
      (preview?.groups ?? []).filter(
        (g) => g.added.length || g.removed.length || g.unknown_ids.length,
      ),
    [preview],
  );

  const columns: GridColDef[] = [
    {
      field: 'operation_name', headerName: cfl(getString('operation')) || 'Operation', flex: 1,
      renderCell: (params: GridRenderCellParams<OESL>) => opLabel(params.row.operation_name),
    },
    {
      field: 'essence_names', headerName: cfl(getString('essences')) || 'Essences', flex: 2, sortable: false,
      renderCell: (params: GridRenderCellParams<OESL>) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
          {params.row.essence_names.map((name) => (
            <Chip key={name} label={essenceLabel(name)} size="small" color="info" variant="outlined" />
          ))}
        </Box>
      ),
    },
    {
      field: 'user_group_names', headerName: cfl(getString('userGroups')) || 'User Groups', flex: 2, sortable: false,
      renderCell: (params: GridRenderCellParams<OESL>) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
          {params.row.user_group_names.map((g) => {
            const gid = nameToGroupId.get(g);
            return (
              <Chip
                key={g}
                label={g}
                size="small"
                onDelete={
                  gid != null
                    ? () => revokeGroupMutation.mutate({ oeslId: params.row.id, groupId: gid })
                    : undefined
                }
              />
            );
          })}
        </Box>
      ),
    },
    {
      field: '_actions', headerName: '', width: 96, sortable: false, filterable: false, disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<OESL>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Tooltip title={getString('editGroups') || 'Edit groups'}>
            <span>
              <IconButton size="small"
                onClick={(e) => { e.stopPropagation(); setRowToEditGroups(params.row); }}>
                <GroupIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={getString('delete') || 'Delete'}>
            <span>
              <IconButton size="small" color="error"
                onClick={(e) => { e.stopPropagation(); setRowToDelete(params.row); }}
                disabled={deleteMutation.isPending}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          {cfl(getString('permissions')) || 'Permissions'}
        </Typography>
        <Stack direction="row" spacing={1}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
          <Tooltip title={getString('uploadBaJsonHint') || "Apply a BA's permission-matrix JSON"}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={dryRunMutation.isPending}
              >
                {cfl(getString('uploadBaJson')) || 'Upload JSON'}
              </Button>
            </span>
          </Tooltip>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setFormOpen((p) => !p)}>
            {cfl(getString('add')) || 'Add'}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField select size="small" label={cfl(getString('filterByOperation')) || 'Filter by operation'}
          value={filterOperation} onChange={(e) => setFilterOperation(e.target.value)} sx={{ width: 220 }}>
          <MenuItem value="">{cfl(getString('all')) || 'All'}</MenuItem>
          {operations.map((op) => <MenuItem key={op.id} value={op.name}>{opLabel(op.name)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={cfl(getString('filterByEssence')) || 'Filter by essence'}
          value={filterEssence} onChange={(e) => setFilterEssence(e.target.value)} sx={{ width: 220 }}>
          <MenuItem value="">{cfl(getString('all')) || 'All'}</MenuItem>
          {essences.map((es) => <MenuItem key={es.id} value={es.name}>{essenceLabel(es.name)}</MenuItem>)}
        </TextField>
      </Box>

      {formOpen && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <OeslForm getString={getString} operations={operations} essences={essences}
            onSubmit={(d) => createMutation.mutate(d)} isPending={createMutation.isPending} />
        </Paper>
      )}

      {isLoading ? <CircularProgress /> : (
        <DataGrid rows={rows} columns={columns} paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel} pageSizeOptions={[10, 25, 50]}
          autoHeight disableRowSelectionOnClick localeText={locale} getRowHeight={() => 'auto'} />
      )}

      <OeslDeleteDialog oesl={rowToDelete} isPending={deleteMutation.isPending}
        onConfirm={() => rowToDelete && deleteMutation.mutate(rowToDelete.id)}
        onClose={() => setRowToDelete(null)} getString={getString} />

      <OeslGroupsDialog
        oesl={rowToEditGroups}
        userGroups={userGroups as UserGroup[]}
        getString={getString}
        onClose={() => setRowToEditGroups(null)}
        onSaved={async () => {
          await qc.invalidateQueries({ queryKey: OESL_QK });
          await qc.invalidateQueries({ queryKey: ['user_groups'] });
          setRowToEditGroups(null);
          setSnackbar({ open: true, message: getString('groupsUpdated') || 'Groups updated', severity: 'success' });
        }}
      />

      {/* Preview + confirm dialog for the uploaded matrix */}
      <Dialog
        open={!!preview}
        onClose={() => { if (!commitMutation.isPending) { setPreview(null); setApplyGroups(null); } }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{cfl(getString('applyPreviewTitle')) || 'Apply permission matrix'}</DialogTitle>
        <DialogContent dividers>
          {preview && (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {getString('applySummary', {
                  added: preview.total_added,
                  removed: preview.total_removed,
                  unknown: preview.total_unknown,
                }) ||
                  `Will grant ${preview.total_added}, revoke ${preview.total_removed}, skip ${preview.total_unknown} unknown.`}
              </Typography>

              {preview.total_unknown > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {getString('applyUnknownWarning') ||
                    'Some permission ids in the file no longer exist and will be skipped.'}
                </Alert>
              )}

              {changedGroups.length === 0 ? (
                <Typography color="text.secondary">
                  {getString('applyNoChanges') || 'No changes — groups already match the file.'}
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {changedGroups.map((g) => (
                    <Box key={g.user_group_id}>
                      <Typography variant="subtitle2">
                        {g.user_group_name || `#${g.user_group_id}`}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {g.added.length > 0 && (
                          <Chip size="small" color="success" variant="outlined"
                            label={`+${g.added.length} ${getString('granted') || 'granted'}`} />
                        )}
                        {g.removed.length > 0 && (
                          <Chip size="small" color="error" variant="outlined"
                            label={`−${g.removed.length} ${getString('revoked') || 'revoked'}`} />
                        )}
                        {g.unknown_ids.length > 0 && (
                          <Chip size="small" color="warning" variant="outlined"
                            label={`${g.unknown_ids.length} ${getString('unknown') || 'unknown'}`} />
                        )}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setPreview(null); setApplyGroups(null); }}
            disabled={commitMutation.isPending}
          >
            {cfl(getString('cancel')) || 'Cancel'}
          </Button>
          <Button
            variant="contained"
            onClick={() => applyGroups && commitMutation.mutate(applyGroups)}
            disabled={commitMutation.isPending || changedGroups.length === 0}
          >
            {cfl(getString('applyConfirm')) || 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
