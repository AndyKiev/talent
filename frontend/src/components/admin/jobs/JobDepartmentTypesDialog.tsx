// src/components/admin/jobs/JobDepartmentTypesDialog.tsx
//
// Job-side editor of the STAFFING department types (department_type_job_links):
// which department types this job is staffed in. Same links as the
// department-types "job links" tab, viewed from the job. Not to be confused
// with the process-role OVERSIGHT targets (JobProcessRoleDialog).

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import type { Job } from './jobApi';
import {
  fetchDepartmentTypes,
  type DepartmentType,
} from '../department_types/departmentTypeApi';
import {
  fetchDepartmentTypeJobLinksByJob,
  type DepartmentTypeJobLink,
} from '../department_types/departmentTypeJobLinkApi';
import { useDepartmentTypeJobLinkMutations } from '../department_types/useDepartmentTypeJobLinkMutations';
import { DepartmentTypeJobLinkDeleteDialog } from '../department_types/DepartmentTypeJobLinkDeleteDialog';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import type { SnackbarType } from '../../../types/types.ts';
import {
  DEPARTMENT_TYPE_JOB_LINK_BY_JOB_QK,
  DEPARTMENT_TYPE_QK,
} from '../../../utils/queryKeys';

interface Props {
  job: Job | null;
  setSnackbar: (s: SnackbarType) => void;
  onClose: () => void;
}

export function JobDepartmentTypesDialog({ job, setSnackbar, onClose }: Props) {
  const getString = useString();

  const [toAdd, setToAdd] = useState<DepartmentType[]>([]);
  const [linkToDelete, setLinkToDelete] = useState<DepartmentTypeJobLink | null>(null);

  const { data: departmentTypes = [] } = useQuery({
    queryKey: DEPARTMENT_TYPE_QK,
    queryFn: () => fetchDepartmentTypes(),
    enabled: job !== null,
    staleTime: 2 * 60 * 1000,
  });
  const typeById = useMemo(
    () => new Map(departmentTypes.map((t) => [t.id, t])),
    [departmentTypes],
  );

  const {
    data: links = [],
    isLoading: linksLoading,
    error: linksError,
  } = useQuery({
    queryKey: DEPARTMENT_TYPE_JOB_LINK_BY_JOB_QK(job?.id ?? 0),
    queryFn: () => fetchDepartmentTypeJobLinksByJob(job!.id),
    enabled: job !== null,
  });

  const sortedLinks = useMemo(
    () =>
      [...links].sort((a, b) =>
        (typeById.get(a.department_type_id)?.name ?? '').localeCompare(
          typeById.get(b.department_type_id)?.name ?? '',
        ),
      ),
    [links, typeById],
  );

  const linkedTypeIds = useMemo(
    () => new Set(links.map((l) => l.department_type_id)),
    [links],
  );
  const addOptions = useMemo(
    () =>
      departmentTypes
        .filter((t) => !linkedTypeIds.has(t.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [departmentTypes, linkedTypeIds],
  );

  const { createLinkMutation, updateLinkMutation, deleteLinkMutation } =
    useDepartmentTypeJobLinkMutations({ setSnackbar });

  const [addPending, setAddPending] = useState(false);

  const handleAdd = async () => {
    if (!job || toAdd.length === 0) return;
    setAddPending(true);
    try {
      // Sequential: each create reports its own snackbar/error; a failure
      // stops the rest and keeps the remaining selection for a retry.
      for (const t of toAdd) {
        await createLinkMutation.mutateAsync({
          department_type_id: t.id,
          job_id: job.id,
        });
        setToAdd((prev) => prev.filter((p) => p.id !== t.id));
      }
    } catch {
      // error already surfaced by the mutation's onError snackbar
    } finally {
      setAddPending(false);
    }
  };

  const handleClose = () => {
    setToAdd([]);
    setLinkToDelete(null);
    onClose();
  };

  const deleteTypeName = linkToDelete
    ? typeById.get(linkToDelete.department_type_id)?.name ?? ''
    : '';

  const busy = addPending || updateLinkMutation.isPending || deleteLinkMutation.isPending;

  return (
    <>
      <Dialog open={job !== null} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {cfl(getString('departmentTypes'))} — {job?.name ?? ''}
        </DialogTitle>

        <DialogContent>
          {linksError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {(linksError as Error).message}
            </Alert>
          )}

          {/* ── Existing links ─────────────────────────────────────────── */}
          {linksLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : sortedLinks.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {getString('noDepartmentTypes')}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
              {sortedLinks.map((link) => (
                <Box
                  key={link.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1,
                    py: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Chip
                    label={typeById.get(link.department_type_id)?.name ?? `#${link.department_type_id}`}
                    size="small"
                    variant={link.is_active ? 'filled' : 'outlined'}
                    color={link.is_active ? 'primary' : 'default'}
                    sx={{ flex: '0 1 auto', maxWidth: '70%' }}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title={cfl(getString('isActive'))}>
                    <Switch
                      size="small"
                      checked={link.is_active}
                      disabled={busy}
                      onChange={(e) =>
                        updateLinkMutation.mutate({
                          linkId: link.id,
                          data: { is_active: e.target.checked },
                        })
                      }
                    />
                  </Tooltip>
                  <Tooltip title={getString('removeLink')}>
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={busy}
                        onClick={() => setLinkToDelete(link)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />

          {/* ── Add links ──────────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              multiple
              size="small"
              options={addOptions}
              getOptionLabel={(t: DepartmentType) => t.name}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              value={toAdd}
              disabled={addPending}
              onChange={(_, value) => setToAdd(value)}
              renderInput={(params) => (
                <TextField {...params} label={cfl(getString('addDepartmentType'))} />
              )}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={addPending ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
              disabled={toAdd.length === 0 || busy}
              onClick={handleAdd}
            >
              {cfl(getString('addLink'))}
            </Button>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={busy}>
            {getString('close')}
          </Button>
        </DialogActions>
      </Dialog>

      {linkToDelete && job && (
        <DepartmentTypeJobLinkDeleteDialog
          open
          linkId={linkToDelete.id}
          jobName={job.name}
          message={getString('removeDepartmentTypeLinkConfirm', {
            departmentTypeName: deleteTypeName,
            jobName: job.name,
          })}
          getString={getString}
          isPending={deleteLinkMutation.isPending}
          onClose={() => setLinkToDelete(null)}
          onConfirm={() =>
            deleteLinkMutation.mutate(
              {
                linkId: linkToDelete.id,
                departmentTypeId: linkToDelete.department_type_id,
              },
              { onSuccess: () => setLinkToDelete(null) },
            )
          }
        />
      )}
    </>
  );
}
