import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import EducationFormDialog from './EducationFormDialog';
import ConfirmDeleteDialog from '../ConfirmDeleteDialog';
import {
    fetchEducationDegrees,
    fetchEmployeeEducations,
    deleteEmployeeEducation,
    type EmployeeEducation,
} from '../peopleReviewApi';
import type { GetStringFn } from '../../../types/getStringFn';

export default function EducationBlock({
    employeeId,
    getString,
    onError,
    onSuccess,
    isEditable = true,
}: {
    employeeId: number;
    getString: GetStringFn;
    onError?: (message: string) => void;
    onSuccess?: (message: string) => void;
    /** When false, the add / edit / delete affordances are hidden (read-only view). */
    isEditable?: boolean;
}) {
    const qc = useQueryClient();
    const [dialog, setDialog] = useState<{ open: boolean; editing: EmployeeEducation | null }>({
        open: false,
        editing: null,
    });
    const [pendingDelete, setPendingDelete] = useState<EmployeeEducation | null>(null);

    const { data: degrees = [] } = useQuery({
        queryKey: ['education_degrees'],
        queryFn: fetchEducationDegrees,
        staleTime: 5 * 60_000,
    });
    const { data: educations = [] } = useQuery({
        queryKey: ['employee_educations', employeeId],
        queryFn: () => fetchEmployeeEducations(employeeId),
        staleTime: 30_000,
    });

    const degreeLabel = (degreeId: number | null): string | null => {
        if (degreeId == null) return null;
        const d = degrees.find((x) => x.id === degreeId);
        return d ? getString(d.name_key) : null;
    };

    const delMut = useMutation({
        mutationFn: (edu: EmployeeEducation) => deleteEmployeeEducation(edu.id),
        onSuccess: async (_data, edu) => {
            await qc.invalidateQueries({ queryKey: ['employee_educations', employeeId] });
            onSuccess?.(getString('employeeEducationDeleteSuccess', { name: edu.institution }));
        },
        onError: (err: Error) => onError?.(err.message),
        onSettled: () => setPendingDelete(null),
    });

    return (
        <Box sx={{ mt: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                <SchoolOutlinedIcon sx={{ fontSize: 17 }} />
                <Typography variant="subtitle2" fontWeight={700}>
                    {getString('education')}
                </Typography>
                {isEditable && (
                    <Tooltip title={getString('addEducation')} placement="top">
                        <IconButton
                            size="small"
                            onClick={() => setDialog({ open: true, editing: null })}
                            sx={{ p: 0.25 }}
                        >
                            <AddIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>

            {educations.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    {getString('noEducation')}
                </Typography>
            ) : (
                <Stack spacing={0.25}>
                    {educations.map((e) => {
                        const parts = [
                            e.institution,
                            degreeLabel(e.degree_id),
                            e.speciality,
                            e.graduation_year != null ? String(e.graduation_year) : null,
                        ].filter(Boolean);
                        return (
                            <Stack
                                key={e.id}
                                direction="row"
                                alignItems="center"
                                spacing={0.5}
                                sx={{ '&:hover .edu-actions': { opacity: 1 } }}
                            >
                                <Typography variant="body2">{parts.join(' · ')}</Typography>
                                {isEditable && (
                                <Stack
                                    direction="row"
                                    className="edu-actions"
                                    sx={{ opacity: 0, transition: 'opacity .15s' }}
                                >
                                    <Tooltip title={getString('editEducation')} placement="top">
                                        <IconButton
                                            size="small"
                                            onClick={() => setDialog({ open: true, editing: e })}
                                            sx={{ p: 0.25 }}
                                        >
                                            <EditIcon sx={{ fontSize: 15 }} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={getString('delete')} placement="top">
                                        <IconButton
                                            size="small"
                                            onClick={() => setPendingDelete(e)}
                                            disabled={delMut.isPending}
                                            sx={{ p: 0.25 }}
                                        >
                                            <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                                )}
                            </Stack>
                        );
                    })}
                </Stack>
            )}

            <EducationFormDialog
                open={dialog.open}
                onClose={() => setDialog({ open: false, editing: null })}
                employeeId={employeeId}
                editing={dialog.editing}
                degrees={degrees}
                getString={getString}
                onSuccess={onSuccess}
                onError={onError}
            />

            <ConfirmDeleteDialog
                open={pendingDelete !== null}
                message={getString('confirmDeleteEducationMessage')}
                itemLabel={pendingDelete?.institution}
                isDeleting={delMut.isPending}
                getString={getString}
                onConfirm={() => { if (pendingDelete) delMut.mutate(pendingDelete); }}
                onClose={() => setPendingDelete(null)}
            />
        </Box>
    );
}
