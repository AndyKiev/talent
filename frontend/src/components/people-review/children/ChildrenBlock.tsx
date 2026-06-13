import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ChildCareOutlinedIcon from '@mui/icons-material/ChildCareOutlined';
import dayjs from 'dayjs';
import ChildFormDialog from './ChildFormDialog';
import ConfirmDeleteDialog from '../ConfirmDeleteDialog';
import {
    fetchEmployeeChildren,
    deleteEmployeeChild,
    type EmployeeChild,
} from '../peopleReviewApi';
import type { GetStringFn } from '../../../types/getStringFn';
import { formatDate } from '../../../utils/date';

const ageOf = (iso: string) => dayjs().diff(dayjs(iso), 'year');

/**
 * Per-employee children block. The headline is the count of children aged <= 14
 * (the only figure shown in read-only / presentation mode, and only when > 0).
 * When editable, the full list with add / delete is shown for management.
 */
export default function ChildrenBlock({
    employeeId,
    getString,
    isEditable = true,
    onError,
    onSuccess,
}: {
    employeeId: number;
    getString: GetStringFn;
    isEditable?: boolean;
    onError?: (message: string) => void;
    onSuccess?: (message: string) => void;
}) {
    const qc = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<EmployeeChild | null>(null);

    const { data: children = [] } = useQuery({
        queryKey: ['employee_children', employeeId],
        queryFn: () => fetchEmployeeChildren(employeeId),
        staleTime: 30_000,
    });

    const delMut = useMutation({
        mutationFn: (child: EmployeeChild) => deleteEmployeeChild(child.id),
        onSuccess: async (_data, child) => {
            await qc.invalidateQueries({ queryKey: ['employee_children', employeeId] });
            onSuccess?.(getString('employeeChildDeleteSuccess', { name: formatDate(child.birth_date) }));
        },
        onError: (err: Error) => onError?.(err.message),
        onSettled: () => setPendingDelete(null),
    });

    const countUnder14 = children.filter((c) => ageOf(c.birth_date) <= 14).length;

    // Read-only view: just the headline count, and only when there is at least
    // one young child (no empty "0" line).
    if (!isEditable) {
        if (countUnder14 === 0) return null;
        return (
            <Stack direction="row" alignItems="center" spacing={0.75}>
                <ChildCareOutlinedIcon sx={{ fontSize: 17 }} />
                <Typography variant="body2" fontWeight={600}>
                    {getString('childrenUnder14')}: {countUnder14}
                </Typography>
            </Stack>
        );
    }

    return (
        <Box sx={{ mt: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                <ChildCareOutlinedIcon sx={{ fontSize: 17 }} />
                <Typography variant="subtitle2" fontWeight={700}>
                    {getString('childrenUnder14')}: {countUnder14}
                </Typography>
                <Tooltip title={getString('addChild')} placement="top">
                    <IconButton size="small" onClick={() => setDialogOpen(true)} sx={{ p: 0.25 }}>
                        <AddIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                </Tooltip>
            </Stack>

            {children.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    {getString('noChildren')}
                </Typography>
            ) : (
                <Stack spacing={0.25}>
                    {children.map((c) => (
                        <Stack
                            key={c.id}
                            direction="row"
                            alignItems="center"
                            spacing={0.5}
                            sx={{ '&:hover .child-actions': { opacity: 1 } }}
                        >
                            <Typography variant="body2">
                                {formatDate(c.birth_date)} · {getString('yearsOld', { age: ageOf(c.birth_date) })}
                            </Typography>
                            <Stack
                                direction="row"
                                className="child-actions"
                                sx={{ opacity: 0, transition: 'opacity .15s' }}
                            >
                                <Tooltip title={getString('delete')} placement="top">
                                    <IconButton
                                        size="small"
                                        onClick={() => setPendingDelete(c)}
                                        disabled={delMut.isPending}
                                        sx={{ p: 0.25 }}
                                    >
                                        <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Stack>
                    ))}
                </Stack>
            )}

            <ChildFormDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                employeeId={employeeId}
                getString={getString}
                onSuccess={onSuccess}
                onError={onError}
            />

            <ConfirmDeleteDialog
                open={pendingDelete !== null}
                message={getString('confirmDeleteChildMessage')}
                itemLabel={pendingDelete ? formatDate(pendingDelete.birth_date) : undefined}
                isDeleting={delMut.isPending}
                getString={getString}
                onConfirm={() => { if (pendingDelete) delMut.mutate(pendingDelete); }}
                onClose={() => setPendingDelete(null)}
            />
        </Box>
    );
}
