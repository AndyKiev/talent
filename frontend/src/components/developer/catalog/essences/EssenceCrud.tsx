// src/components/admin/essences/EssenceCrud.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid } from '@mui/x-data-grid';
import { fetchEssences, type Essence } from './essenceApi.ts';
import { useEssenceMutations } from './useEssenceMutations.ts';
import { useEssenceColumns, type EditingState } from './useEssenceColumns.tsx';
import { EssenceForm } from './EssenceForm.tsx';
import { EssenceDeleteDialog } from './EssenceDeleteDialog.tsx';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale.ts';
import useString from '../../../../hooks/useString.ts';
import str from '../../../../strings/str.ts';
import cfl from '../../../../utils/helpers.ts';
import {ESSENCE_QK} from "../../../../utils/queryKeys.ts";

export function EssenceCrud() {
  const getString = useString({ str });
  const locale = useDataGridLocale();

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingState, setEditingState] = useState<EditingState>({ rowId: null, field: null });
  const [rowToDelete, setRowToDelete] = useState<Essence | null>(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ESSENCE_QK,
    queryFn: fetchEssences,
    staleTime: 2 * 60 * 1000,
  });

  const { createMutation, updateMutation, deleteMutation } = useEssenceMutations({
    setSnackbar,
    onCreateSuccess: () => setFormOpen(false),
    onUpdateSuccess: () => setEditingState({ rowId: null, field: null }),
    onDeleteSuccess: () => setRowToDelete(null),
  });

  const columns = useEssenceColumns({
    getString,
    editingState,
    onEditFieldClick: (row, field, e) => {
      e.stopPropagation();
      setEditingState({ rowId: row.id, field });
    },
    // Save fires the mutation directly — no intermediate confirm dialog needed
    onSave: (row, field, newValue) => {
      updateMutation.mutate({ id: row.id, data: { [field]: newValue } });
    },
    onCancelEdit: () => setEditingState({ rowId: null, field: null }),
    updateIsPending: updateMutation.isPending,
    onDeleteClick: setRowToDelete,
    deleteIsPending: deleteMutation.isPending,
  });

  if (error) return <Alert severity="error">Failed to load essences</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          {cfl(getString('essences')) || 'Essences'}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setFormOpen((p) => !p)}
        >
          {cfl(getString('add')) || 'Add'}
        </Button>
      </Box>

      {formOpen && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <EssenceForm
            getString={getString}
            onSubmit={(d) => createMutation.mutate(d)}
            isPending={createMutation.isPending}
          />
        </Paper>
      )}

      {isLoading ? (
        <CircularProgress />
      ) : (
        <DataGrid
          rows={rows}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          autoHeight
          disableRowSelectionOnClick
          localeText={locale}
        />
      )}

      <EssenceDeleteDialog
        essence={rowToDelete}
        isPending={deleteMutation.isPending}
        onConfirm={() => rowToDelete && deleteMutation.mutate(rowToDelete.id)}
        onClose={() => setRowToDelete(null)}
        getString={getString}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
