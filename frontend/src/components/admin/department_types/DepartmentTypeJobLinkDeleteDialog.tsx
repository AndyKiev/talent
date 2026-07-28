// src/components/admin/department_types/DepartmentTypeJobLinkDeleteDialog.tsx
//
// Confirm dialog for removing a department-type ↔ job link. When the headcount
// plan feature is on it also warns how many effective-dated target-qty rows
// (department_job_targets) will be cascade-deleted together with the link.
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
} from '@mui/material';
import { fetchTargetCountByLink } from '../../employees/headcount_plan/headcountPlanApi';
import { HEADCOUNT_TARGET_COUNT_BY_LINK_QK } from '../../../utils/queryKeys';
import { useBooleanSetting } from '../../../hooks/useAppSetting';
import type { GetStringFn } from '../../../types/getStringFn';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';

interface Props {
    open: boolean;
    linkId: number;
    jobName: string;
    getString: GetStringFn;
    onClose: () => void;
    onConfirm: () => void;
    isPending: boolean;
}

export function DepartmentTypeJobLinkDeleteDialog({
    open,
    linkId,
    jobName,
    getString,
    onClose,
    onConfirm,
    isPending,
}: Props) {
    const { enabled: headcountOn } = useBooleanSetting('headcount_plan_enabled');

    // Only worth a round-trip while the feature (and thus the endpoint) is on.
    const { data: targetCount } = useQuery({
        queryKey: HEADCOUNT_TARGET_COUNT_BY_LINK_QK(linkId),
        queryFn: () => fetchTargetCountByLink(linkId),
        enabled: open && headcountOn,
    });

    const count = targetCount?.count ?? 0;

    return (
        <ConfirmDeleteDialog
            open={open}
            title={getString('removeLink')}
            message={getString('removeJobLinkConfirm', { jobName })}
            isDeleting={isPending}
            onConfirm={onConfirm}
            onClose={onClose}
            children={
                count > 0 ? (
                    <Alert severity="warning">
                        {getString('planRowsCascadeWarning', { count })}
                    </Alert>
                ) : undefined
            }
        />
    );
}
