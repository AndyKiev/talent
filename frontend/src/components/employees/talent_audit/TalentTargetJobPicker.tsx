// src/components/employees/talent_audit/TalentTargetJobPicker.tsx
//
// Controlled, form-agnostic picker for ONE talent target job: department type
// (tree) → target job (filtered by type) → talent status/period ("talent
// level"). Owns NO form state — the parent passes the selected ids and gets
// change callbacks (with the human label, so it can show a selected-list). It
// runs its own jobs/pairs queries internally.
//
// Reused by both the standalone TalentAuditJobDialog and the employee
// registration form (EmployeeCreateDialog), so the business logic stays
// identical in both places.
import { useQuery } from '@tanstack/react-query';
import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
    fetchJobsByDepartmentType,
    type JobWithLinkId,
} from '../../admin/department_types/departmentTypeJobLinkApi';
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';
import { DepartmentTypeSelectTree } from './DepartmentTypeSelectTree';
import { DEPT_TYPE_JOB_LINK_QK, TSPL_QK } from '../../../utils/queryKeys';
import useString from '../../../hooks/useString';

export interface StatusPeriodOption {
    id: number;
    label: string;
}

interface Props {
    /** Department type chosen in the tree (controlled). */
    selectedTypeId: number | null;
    selectedTypeName: string;
    onSelectType: (typeId: number, typeName: string) => void;
    /** Target job (controlled). '' = none picked. */
    targetJobId: number | '';
    onTargetJob: (jobId: number, jobName: string) => void;
    /** Talent status/period link (controlled). '' = none picked. */
    talentLinkId: number | '';
    onTalentLink: (linkId: number, label: string) => void;
    /** Validation flags from the parent form. */
    targetJobError?: boolean;
    talentLinkError?: boolean;
    disabled?: boolean;
}

export function TalentTargetJobPicker({
    selectedTypeId,
    selectedTypeName,
    onSelectType,
    targetJobId,
    onTargetJob,
    talentLinkId,
    onTalentLink,
    targetJobError = false,
    talentLinkError = false,
    disabled = false,
}: Props) {
    const getString = useString();

    // Jobs linked to the chosen department type (active links only).
    const { data: jobs = [], isLoading: jobsLoading } = useQuery<JobWithLinkId[]>({
        queryKey: [...DEPT_TYPE_JOB_LINK_QK, 'by_type', selectedTypeId, true],
        queryFn: () => fetchJobsByDepartmentType(selectedTypeId as number, true),
        enabled: selectedTypeId != null,
        staleTime: 2 * 60 * 1000,
    });

    // Talent status + period pairs (the "talent level" select).
    const { data: pairs = [], isLoading: pairsLoading } = useQuery<StatusPeriodOption[]>({
        queryKey: [...TSPL_QK, 'active-pairs', true],
        queryFn: async () => {
            const res = await axiosInstance.get<StatusPeriodOption[]>(
                `${BASE_URL}/talent_status_period_links/active_pairs?is_active=true`,
            );
            return res.data ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const jobHelper =
        selectedTypeId == null
            ? getString('selectTypeFirst')
            : !jobsLoading && jobs.length === 0
                ? getString('noJobsForType')
                : targetJobError
                    ? getString('fieldRequired')
                    : selectedTypeName
                        ? `${getString('jobsFor')}: ${selectedTypeName}`
                        : '';

    return (
        <Stack spacing={2}>
            {/* 1. Department type tree */}
            <Stack spacing={0.5}>
                <Typography variant="subtitle2">
                    {getString('selectDepartmentType')}
                </Typography>
                <DepartmentTypeSelectTree
                    selectedTypeId={selectedTypeId}
                    onSelect={onSelectType}
                />
            </Stack>

            {/* 2. Target job (filtered by the chosen type) */}
            <TextField
                select
                fullWidth
                variant="outlined"
                label={getString('targetJob')}
                value={targetJobId === '' ? '' : String(targetJobId)}
                onChange={(e) => {
                    const id = Number(e.target.value);
                    const job = jobs.find((j) => j.id === id);
                    onTargetJob(id, job?.name ?? '');
                }}
                disabled={disabled || selectedTypeId == null || jobsLoading}
                error={targetJobError}
                helperText={jobHelper}
            >
                {jobs.map((j) => (
                    <MenuItem key={j.id} value={String(j.id)}>
                        {j.name}
                    </MenuItem>
                ))}
            </TextField>

            {/* 3. Talent status & period (talent level) */}
            <TextField
                select
                fullWidth
                variant="outlined"
                label={getString('talentStatusPeriod')}
                value={talentLinkId === '' ? '' : String(talentLinkId)}
                onChange={(e) => {
                    const id = Number(e.target.value);
                    const pair = pairs.find((p) => p.id === id);
                    onTalentLink(id, pair?.label ?? '');
                }}
                disabled={disabled || pairsLoading}
                error={talentLinkError}
                helperText={talentLinkError ? getString('fieldRequired') : ''}
            >
                {pairs.map((p) => (
                    <MenuItem key={p.id} value={String(p.id)}>
                        {p.label}
                    </MenuItem>
                ))}
            </TextField>
        </Stack>
    );
}
