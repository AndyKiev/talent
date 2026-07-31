// src/components/employees/talent_audit/TalentAuditPage.tsx
import { useState, useMemo } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTalentAuditByEmployee,
  fetchTalentAuditJobsByAudit,
  fetchInterviewsByAudit,
  createTalentAudit,
  deleteTalentAuditJob,
  deleteTalentAuditInterview,
  type TalentAudit,
  type TalentAuditJob,
  type TalentAuditInterview,
} from './talentAuditApi';
import { TalentAuditJobDialog } from './TalentAuditJobDialog';
import { TalentAuditInterviewDialog } from './TalentAuditInterviewDialog';
import { TalentAuditJobStatusDialog } from './TalentAuditJobStatusDialog';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import { useDataGridStyles } from '../../../hooks/useDataGridStyles';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { formatToUkrDate } from '../../../utils/dateFormatter';

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : formatToUkrDate(value);
};

const auditQK = (employeeId: number) => ['talent_audit', 'by_employee', employeeId] as const;
const auditJobsQK = (auditId: number) => ['talent_audit_jobs', 'by_audit', auditId] as const;
const interviewsQK = (auditId: number) => ['talent_audit_interviews', 'by_audit', auditId] as const;

interface FlatRow {
  id: string;
  auditJobId: number;
  jobName: string;
  hrmLabel: string;
  interviewDate: string;
  hrsLabel: string;
  interviewId: number | null;
  statusName: string;
  statusId: number;
}

function buildFlatRows(
    auditJobs: TalentAuditJob[],
    interviews: TalentAuditInterview[],
): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const aj of auditJobs) {
    let hasInterview = false;
    for (const interview of interviews) {
      for (const ij of interview.interview_jobs ?? []) {
        if (ij.talent_audit_job_id === aj.id) {
          hasInterview = true;
          rows.push({
            id: `${aj.id}-${interview.id}-${ij.id}`,
            auditJobId: aj.id,
            jobName: aj.job_name ?? `Job #${aj.target_job_id}`,
            hrmLabel: aj.hrm_status_period_label ?? `Link #${aj.talent_status_period_link_id}`,
            interviewDate: interview.interview_date,
            hrsLabel: ij.hrs_status_period_label ?? `Link #${ij.talent_status_period_link_id}`,
            interviewId: interview.id,
            statusName: aj.status_name ?? `Status #${aj.status_id}`,
            statusId: aj.status_id,
          });
        }
      }
    }
    if (!hasInterview) {
      rows.push({
        id: `${aj.id}-no-interview`,
        auditJobId: aj.id,
        jobName: aj.job_name ?? `Job #${aj.target_job_id}`,
        hrmLabel: aj.hrm_status_period_label ?? `Link #${aj.talent_status_period_link_id}`,
        interviewDate: '',
        hrsLabel: '',
        interviewId: null,
        statusName: aj.status_name ?? `Status #${aj.status_id}`,
        statusId: aj.status_id,
      });
    }
  }
  return rows;
}

interface DeleteTarget {
  type: 'job' | 'interview';
  id: number;
  label: string;
}

export function TalentAuditPage() {
  const { employeeId: employeeIdStr } = useParams({
    from: '/employees/$employeeId/talent_audit/',
  });
  const employeeId = Number(employeeIdStr);
  const getString = useString({ str });
  const qc = useQueryClient();
  const dataGridSx = useDataGridStyles();
  const localeText = useDataGridLocale();

  const [addJobOpen, setAddJobOpen] = useState(false);
  const [addInterviewOpen, setAddInterviewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    auditJobId: number;
    statusId: number;
    jobName: string;
  } | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const showNotification = (message: string, severity: 'success' | 'error' = 'success') =>
      setSnackbar({ open: true, message, severity });

  const auditQKey = auditQK(employeeId);
  const { data: audit, isLoading: auditLoading, error: auditError } = useQuery<TalentAudit | null>({
    queryKey: auditQKey,
    queryFn: () => fetchTalentAuditByEmployee(employeeId),
    enabled: !!employeeId,
  });

  const createAuditMutation = useMutation({
    mutationFn: () => createTalentAudit({ employee_id: employeeId, status_id: 1 }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: auditQKey });
      showNotification(res.detail);
    },
    onError: () => showNotification(getString('createFailed') || 'Failed to create audit', 'error'),
  });

  const jobsQKey = audit ? auditJobsQK(audit.id) : (['talent_audit_jobs', 'none'] as const);
  const { data: auditJobs = [], isLoading: jobsLoading } = useQuery<TalentAuditJob[]>({
    queryKey: jobsQKey,
    queryFn: () => fetchTalentAuditJobsByAudit(audit!.id),
    enabled: !!audit,
  });

  const ivQKey = audit ? interviewsQK(audit.id) : (['talent_audit_interviews', 'none'] as const);
  const { data: interviews = [], isLoading: interviewsLoading } = useQuery<TalentAuditInterview[]>({
    queryKey: ivQKey,
    queryFn: () => fetchInterviewsByAudit(audit!.id),
    enabled: !!audit,
  });

  const flatRows = useMemo(() => buildFlatRows(auditJobs, interviews), [auditJobs, interviews]);

  const deleteJobMutation = useMutation({
    mutationFn: (id: number) => deleteTalentAuditJob(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: jobsQKey });
      await qc.invalidateQueries({ queryKey: ivQKey });
      showNotification(getString('deleteSuccess') || 'Deleted');
      setDeleteTarget(null);
    },
    onError: () => {
      showNotification(getString('deleteFailed') || 'Delete failed', 'error');
      setDeleteTarget(null);
    },
  });

  const deleteInterviewMutation = useMutation({
    mutationFn: (id: number) => deleteTalentAuditInterview(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ivQKey });
      await qc.invalidateQueries({ queryKey: jobsQKey });
      showNotification(getString('deleteSuccess') || 'Deleted');
      setDeleteTarget(null);
    },
    onError: () => {
      showNotification(getString('deleteFailed') || 'Delete failed', 'error');
      setDeleteTarget(null);
    },
  });

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'job') deleteJobMutation.mutate(deleteTarget.id);
    else deleteInterviewMutation.mutate(deleteTarget.id);
  };

  const isDeleting = deleteJobMutation.isPending || deleteInterviewMutation.isPending;

  const columns: GridColDef<FlatRow>[] = [
    { field: 'jobName', headerName: getString('jobName') || 'Job Name', flex: 1.5, minWidth: 140 },
    { field: 'hrmLabel', headerName: getString('hrmStatusPeriod') || 'HRM Status/Period', flex: 1, minWidth: 120 },
    {
      field: 'interviewDate',
      headerName: getString('interviewDate') || 'Interview Date',
      flex: 1,
      minWidth: 110,
      valueFormatter: (value: string) => formatDate(value),
    },
    { field: 'hrsLabel', headerName: getString('hrsStatusPeriod') || 'HRS Status/Period', flex: 1, minWidth: 120 },
    { field: 'statusName', headerName: getString('status') || 'Status', width: 100 },
    {
      field: '_actions',
      headerName: '',
      width: 110,
      sortable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.25 }}>
            <Tooltip title={getString('changeJobStatus') || 'Change status'}>
              <IconButton
                  size="small"
                  onClick={() =>
                      setStatusTarget({
                        auditJobId: row.auditJobId,
                        statusId: row.statusId,
                        jobName: row.jobName,
                      })
                  }
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {!row.interviewId && (
                <Tooltip title={getString('deleteJobAssessment') || 'Delete job assessment'}>
                  <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteTarget({ type: 'job', id: row.auditJobId, label: row.jobName })}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
            )}
            {row.interviewId && (
                <Tooltip title={getString('deleteInterview') || 'Delete interview'}>
                  <IconButton
                      size="small"
                      color="error"
                      onClick={() =>
                          setDeleteTarget({
                            type: 'interview',
                            id: row.interviewId!,
                            label: `${row.jobName} (${formatDate(row.interviewDate)})`,
                          })
                      }
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
            )}
          </Box>
      ),
    },
  ];

  const loading = jobsLoading || interviewsLoading;

  // ── Render (no AppShell / breadcrumbs — provided by the card layout) ─────────
  return (
      <Box>
        {auditLoading && <CircularProgress />}
        {auditError && <Alert severity="error">{getString('loadFailed') || 'Failed to load'}</Alert>}

        {!auditLoading && audit === null && (
            <Paper sx={{ p: 3, textAlign: 'center' }} variant="outlined">
              <RecordVoiceOverIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary" mb={2}>
                {getString('noTalentAudit') || 'No talent audit exists for this employee yet.'}
              </Typography>
              <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => createAuditMutation.mutate()}
                  disabled={createAuditMutation.isPending}
              >
                {createAuditMutation.isPending
                    ? <CircularProgress size={18} />
                    : (getString('createTalentAudit') || 'Create Talent Audit')}
              </Button>
            </Paper>
        )}

        {audit && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {getString('talentAuditJobs') || 'Job Assessments'}
                </Typography>
                <Stack direction="row" gap={1}>
                  <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setAddInterviewOpen(true)}>
                    {getString('addInterview') || 'Add Interview'}
                  </Button>
                  <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setAddJobOpen(true)}>
                    {getString('addTalentAuditJob') || 'Add Job Assessment'}
                  </Button>
                </Stack>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                  <CircularProgress />
              ) : flatRows.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    {getString('noTalentAuditJobs') || 'No job assessments added yet.'}
                  </Typography>
              ) : (
                  <DataGrid
                      rows={flatRows}
                      columns={columns}
                      autoHeight
                      hideFooter={flatRows.length <= 10}
                      disableRowSelectionOnClick
                      sx={dataGridSx}
                      localeText={localeText}
                  />
              )}
            </Paper>
        )}

        {audit && (
            <>
              <TalentAuditJobDialog
                  open={addJobOpen}
                  talentAuditId={audit.id}
                  auditJobsQK={jobsQKey}
                  onClose={() => setAddJobOpen(false)}
                  onSuccess={(msg) => showNotification(msg)}
              />
              {/* Mount-fresh: unmounting on close resets the form and the
                  discrepancy-confirmation state, so the dialog needs no
                  reset-on-close effect. */}
              {addInterviewOpen && (
                  <TalentAuditInterviewDialog
                      open
                      talentAuditId={audit.id}
                      interviewsQK={ivQKey}
                      auditJobsQK={jobsQKey}
                      onClose={() => setAddInterviewOpen(false)}
                      onSuccess={(msg) => showNotification(msg)}
                      onError={(msg) => showNotification(msg, 'error')}
                  />
              )}
              <TalentAuditJobStatusDialog
                  open={!!statusTarget}
                  auditJobId={statusTarget?.auditJobId ?? null}
                  currentStatusId={statusTarget?.statusId ?? null}
                  jobName={statusTarget?.jobName}
                  auditJobsQK={jobsQKey}
                  onClose={() => setStatusTarget(null)}
                  onSuccess={(msg) => showNotification(msg)}
                  onError={(msg) => showNotification(msg, 'error')}
              />
            </>
        )}

        <Dialog open={!!deleteTarget} onClose={() => !isDeleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
          <DialogTitle>
            {deleteTarget?.type === 'interview'
                ? getString('confirmDeleteInterview') || 'Delete Interview?'
                : getString('confirmDeleteJobAssessment') || 'Delete Job Assessment?'}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              {deleteTarget?.type === 'interview'
                  ? getString('confirmDeleteInterviewMessage') || 'This will delete the interview and revert all related job assessments to "created" status.'
                  : getString('confirmDeleteJobAssessmentMessage') || 'This will permanently delete the job assessment.'}
            </Typography>
            {deleteTarget && (
                <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                  {deleteTarget.label}
                </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              {getString('cancel') || 'Cancel'}
            </Button>
            <Button variant="contained" color="error" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? <CircularProgress size={18} /> : (getString('delete') || 'Delete')}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
  );
}
