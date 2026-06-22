import { useState } from 'react';
import {
    Chip,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme/ThemeContext';
import type { GetStringFn } from '../../../types/getStringFn';
import {
    fetchTalentAuditByEmployee,
    fetchTalentAuditJobsByAudit,
    createTalentAudit,
    deleteTalentAuditJob,
    type TalentAuditJob,
} from '../../employees/talent_audit/talentAuditApi';
import { TalentAuditJobDialog } from '../../employees/talent_audit/TalentAuditJobDialog';

// Cache keys shared with the list-of-persons talent-audit screen, so edits here
// and there stay in lock-step (same table, same rows).
const auditQK = (employeeId: number) => ['talent_audit', 'by_employee', employeeId] as const;
const auditJobsQK = (auditId: number) => ['talent_audit_jobs', 'by_audit', auditId] as const;

interface Props {
    employeeId: number | undefined;
    /** True only when the dev setting is on AND the record is editable. */
    editable: boolean;
    getString: GetStringFn;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
}

/**
 * People-review job-info display (and optional editing) of the employee's talent
 * status / status-period / target-job — the very same `talent_audit_job` rows as
 * the list-of-persons screen (no interviews). Always shown; editing is gated.
 */
export function TalentStatusPeriodPanel({ employeeId, editable, getString, onSuccess, onError }: Props) {
    const { t } = useTheme();
    const qc = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);

    const { data: audit } = useQuery({
        queryKey: employeeId ? auditQK(employeeId) : ['talent_audit', 'none'],
        queryFn: () => fetchTalentAuditByEmployee(employeeId!),
        enabled: !!employeeId,
        staleTime: 30_000,
    });

    const jobsKey = audit ? auditJobsQK(audit.id) : (['talent_audit_jobs', 'none'] as const);
    const { data: jobs = [], isLoading } = useQuery({
        queryKey: jobsKey,
        queryFn: () => fetchTalentAuditJobsByAudit(audit!.id),
        enabled: !!audit,
        staleTime: 30_000,
    });

    // Create the audit on first add (mirrors the list-of-persons "Create Talent
    // Audit" step) so editing never dead-ends on a missing audit.
    const createAuditMut = useMutation({
        mutationFn: () => createTalentAudit({ employee_id: employeeId!, status_id: 1 }),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: auditQK(employeeId!) });
            setDialogOpen(true);
        },
        onError: (err: Error) => onError(err.message),
    });

    const deleteJobMut = useMutation({
        mutationFn: (id: number) => deleteTalentAuditJob(id),
        onSuccess: async () => {
            if (audit) await qc.invalidateQueries({ queryKey: auditJobsQK(audit.id) });
            onSuccess(getString('deleteSuccess'));
        },
        onError: (err: Error) => onError(err.message),
    });

    const handleAdd = () => {
        if (audit) setDialogOpen(true);
        else if (employeeId) createAuditMut.mutate();
    };

    const lastIdx = jobs.length - 1;

    return (
        <Stack spacing={0.25} alignItems="flex-start">
            <Typography variant="caption" color={t.textMuted} sx={{ lineHeight: 1.1 }}>
                {getString('talentStatusPeriod')}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" rowGap={0.5}>
                {isLoading ? (
                    <CircularProgress size={14} thickness={5} />
                ) : jobs.length === 0 ? (
                    <Chip
                        size="small"
                        icon={<WorkspacePremiumOutlinedIcon sx={{ fontSize: 16 }} />}
                        label="—"
                        sx={{ fontWeight: 700, fontSize: 12, bgcolor: `${t.textMuted}18`, color: t.textMuted }}
                    />
                ) : (
                    jobs.map((job: TalentAuditJob, idx) => {
                        const isLatest = idx === lastIdx;
                        const label = [
                            job.job_name,
                            job.hrm_status_period_label,
                            job.status_name,
                        ].filter(Boolean).join(' · ');
                        return (
                            <Chip
                                key={job.id}
                                size="small"
                                icon={<WorkspacePremiumOutlinedIcon sx={{ fontSize: 16 }} />}
                                label={label}
                                onDelete={editable ? () => deleteJobMut.mutate(job.id) : undefined}
                                deleteIcon={<CloseIcon />}
                                variant={isLatest ? 'filled' : 'outlined'}
                                sx={{
                                    fontWeight: isLatest ? 700 : 500,
                                    fontSize: 12,
                                    bgcolor: isLatest ? `${t.accent}18` : 'transparent',
                                    color: isLatest ? t.accent : t.text,
                                }}
                            />
                        );
                    })
                )}
                {editable && (
                    <Tooltip title={getString('addTalentAuditJob')}>
                        <span>
                            <IconButton
                                size="small"
                                onClick={handleAdd}
                                disabled={createAuditMut.isPending || !employeeId}
                                sx={{ border: `1px solid ${t.borderLight}`, borderRadius: '7px', p: 0.3 }}
                            >
                                {createAuditMut.isPending
                                    ? <CircularProgress size={14} thickness={5} />
                                    : <AddIcon sx={{ fontSize: 16 }} />}
                            </IconButton>
                        </span>
                    </Tooltip>
                )}
            </Stack>

            {audit && (
                <TalentAuditJobDialog
                    open={dialogOpen}
                    talentAuditId={audit.id}
                    auditJobsQK={auditJobsQK(audit.id)}
                    onClose={() => setDialogOpen(false)}
                    onSuccess={(msg) => onSuccess(msg)}
                />
            )}
        </Stack>
    );
}
