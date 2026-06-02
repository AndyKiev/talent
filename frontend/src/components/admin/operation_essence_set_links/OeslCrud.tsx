// src/components/admin/operation_essence_set_links/OeslCrud.tsx
import {useMemo, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {DataGrid, type GridColDef, type GridRenderCellParams} from '@mui/x-data-grid';
import {createOESL, deleteOESL, fetchOESLs, type OESL} from './oeslApi';
import {fetchOperations} from '../operations/operationApi';
import {fetchEssences} from '../essences/essenceApi';
import {OeslForm} from './OeslForm';
import {OeslDeleteDialog} from './OeslDeleteDialog';
import {useDataGridLocale} from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {ESSENCE_QK, OESL_QK, OPERATION_QK} from "../../../utils/queryKeys.ts";

export function OeslCrud() {
  const getString = useString({ str });
  const qc = useQueryClient();
  const locale = useDataGridLocale();

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [formOpen, setFormOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<OESL | null>(null);
  const [filterOperation, setFilterOperation] = useState('');
  const [filterEssence, setFilterEssence] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

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

  const columns: GridColDef[] = [
    { field: 'operation_name', headerName: cfl(getString('operation')) || 'Operation', flex: 1 },
    {
      field: 'essence_names', headerName: cfl(getString('essences')) || 'Essences', flex: 2, sortable: false,
      renderCell: (params: GridRenderCellParams<OESL>) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
          {params.row.essence_names.map((name) => (
            <Chip key={name} label={name} size="small" color="info" variant="outlined" />
          ))}
        </Box>
      ),
    },
    {
      field: 'user_group_names', headerName: cfl(getString('userGroups')) || 'User Groups', flex: 2, sortable: false,
      renderCell: (params: GridRenderCellParams<OESL>) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
          {params.row.user_group_names.map((g) => <Chip key={g} label={g} size="small" />)}
        </Box>
      ),
    },
    {
      field: '_actions', headerName: '', width: 56, sortable: false, filterable: false, disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<OESL>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
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
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setFormOpen((p) => !p)}>
          {cfl(getString('add')) || 'Add'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField select size="small" label={cfl(getString('filterByOperation')) || 'Filter by operation'}
          value={filterOperation} onChange={(e) => setFilterOperation(e.target.value)} sx={{ width: 220 }}>
          <MenuItem value="">{cfl(getString('all')) || 'All'}</MenuItem>
          {operations.map((op) => <MenuItem key={op.id} value={op.name}>{op.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={cfl(getString('filterByEssence')) || 'Filter by essence'}
          value={filterEssence} onChange={(e) => setFilterEssence(e.target.value)} sx={{ width: 220 }}>
          <MenuItem value="">{cfl(getString('all')) || 'All'}</MenuItem>
          {essences.map((es) => <MenuItem key={es.id} value={es.name}>{es.name}</MenuItem>)}
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

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
