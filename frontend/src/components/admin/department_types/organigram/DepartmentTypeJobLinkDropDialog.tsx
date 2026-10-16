// src/components/admin/department_types/organigram/DepartmentTypeJobLinkDropDialog.tsx
//
// Confirms a job drop in the organigram's JOBS mode: add a link, move one
// (create on the new type + delete the old link — the API has no re-point)
// or unlink. Move and unlink DELETE a link, which cascade-deletes its
// headcount-plan target rows, so — like DepartmentTypeJobLinkDeleteDialog —
// the count is fetched and warned about when the headcount plan is on.
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import { fetchTargetCountByLink } from '../../../employees/headcount_plan/headcountPlanApi';
import { HEADCOUNT_TARGET_COUNT_BY_LINK_QK } from '../../../../utils/queryKeys';
import { useBooleanSetting } from '../../../../hooks/useAppSetting';
import type { GetStringFn } from '../../../../types/getStringFn';

export type JobDropKind = 'add' | 'move' | 'unlink';

interface Props {
    kind: JobDropKind | null;
    title: string;
    message: string;
    /** Optional scope note (e.g. how many departments the change affects). */
    note?: string | null;
    /** The link that will be DELETED (move / unlink), for the cascade warning. */
    deletedLinkId: number | null;
    isPending: boolean;
    onConfirm: () => void;
    onClose: () => void;
    getString: GetStringFn;
}

export function DepartmentTypeJobLinkDropDialog({
    kind,
    title,
    message,
    note = null,
    deletedLinkId,
    isPending,
    onConfirm,
    onClose,
    getString,
}: Props) {
    const { enabled: headcountOn } = useBooleanSetting('headcount_plan_enabled');
    const { data: targetCount } = useQuery({
        queryKey: HEADCOUNT_TARGET_COUNT_BY_LINK_QK(deletedLinkId ?? 0),
        queryFn: () => fetchTargetCountByLink(deletedLinkId!),
        enabled: kind != null && deletedLinkId != null && headcountOn,
    });
    const cascade = deletedLinkId != null ? (targetCount?.count ?? 0) : 0;

    return (
        <Dialog open={kind != null} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{message}</DialogContentText>
                {note && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        {note}
                    </Alert>
                )}
                {cascade > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        {getString('planRowsCascadeWarning', { count: cascade })}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isPending}>
                    {getString('cancel')}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color={kind === 'unlink' ? 'warning' : 'success'}
                    disabled={isPending}
                    startIcon={isPending ? <CircularProgress size={16} /> : undefined}
                >
                    {getString('continue')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
