// src/components/admin/department_types/useDepartmentTypeJobLinkMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createDepartmentTypeJobLink,
    updateDepartmentTypeJobLink,
    deleteDepartmentTypeJobLink,
} from './departmentTypeJobLinkApi';
import {DEPARTMENT_TYPE_QK, JOB_QK} from "../../../utils/queryKeys.ts";


type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

/** Job-side caches: the jobs grid chips + every per-job link list
 *  (DEPARTMENT_TYPE_JOB_LINK_BY_JOB_QK shares this key[0]). */
const JOB_SIDE_KEYS = [JOB_QK, ['department_type_job_links']] as const;

/** Query key factory — jobs for a given department type */
export const deptTypeJobsQK = (departmentTypeId: number) =>
    ['department_type_jobs', departmentTypeId] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
}

export function useDepartmentTypeJobLinkMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
}: Props) {
    const qc = useQueryClient();

    const createLinkMutation = useMutation({
        mutationFn: createDepartmentTypeJobLink,
        onSuccess: async (res, variables) => {
            await Promise.all([
                qc.invalidateQueries({
                    queryKey: deptTypeJobsQK(variables.department_type_id),
                }),
                // Refresh the list so the job_count chip stays accurate
                qc.invalidateQueries({ queryKey: DEPARTMENT_TYPE_QK }),
                ...JOB_SIDE_KEYS.map((queryKey) => qc.invalidateQueries({ queryKey })),
            ]);
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateLinkMutation = useMutation({
        mutationFn: updateDepartmentTypeJobLink,
        onSuccess: async (res) => {
            // We don't know the dept type ID here, so invalidate all job-link queries.
            // job_count is unaffected by is_active toggles, so no list invalidation needed.
            await Promise.all([
                qc.invalidateQueries({ queryKey: ['department_type_jobs'] }),
                ...JOB_SIDE_KEYS.map((queryKey) => qc.invalidateQueries({ queryKey })),
            ]);
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteLinkMutation = useMutation({
        mutationFn: ({
            linkId,
        }: {
            linkId: number;
            departmentTypeId: number;
        }) => deleteDepartmentTypeJobLink(linkId),
        onSuccess: async (res, variables) => {
            await Promise.all([
                qc.invalidateQueries({
                    queryKey: deptTypeJobsQK(variables.departmentTypeId),
                }),
                // Refresh the list so the job_count chip stays accurate
                qc.invalidateQueries({ queryKey: DEPARTMENT_TYPE_QK }),
                ...JOB_SIDE_KEYS.map((queryKey) => qc.invalidateQueries({ queryKey })),
                // Headcount targets referencing the link were cascade-deleted.
                qc.invalidateQueries({ queryKey: ['headcount_calc'] }),
                qc.invalidateQueries({ queryKey: ['headcount_targets'] }),
                qc.invalidateQueries({ queryKey: ['headcount_target_count_by_link'] }),
            ]);
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onDeleteSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    return { createLinkMutation, updateLinkMutation, deleteLinkMutation };
}
