import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';
import BirthDateWheelPicker from '../personal-data/BirthDateWheelPicker';
import { createEmployeeChild } from '../peopleReviewApi';
import type { GetStringFn } from '../../../types/getStringFn';
import { formatDate } from '../../../utils/date';

interface FormValues {
    date: string | null; // ISO 'YYYY-MM-DD'
}

/** Add-a-child dialog — captures only a birth date (no name), via the 3-wheel picker. */
export default function ChildFormDialog({
    open,
    onClose,
    employeeId,
    getString,
    onSuccess,
    onError,
}: {
    open: boolean;
    onClose: () => void;
    employeeId: number;
    getString: GetStringFn;
    onSuccess?: (message: string) => void;
    onError?: (message: string) => void;
}) {
    const qc = useQueryClient();
    const { control, handleSubmit, reset, watch } = useForm<FormValues>({
        defaultValues: { date: null },
    });

    // Re-seed the form whenever the dialog (re)opens.
    useEffect(() => {
        if (open) reset({ date: null });
    }, [open, reset]);

    const mut = useMutation({
        mutationFn: (iso: string) => createEmployeeChild(employeeId, iso),
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['employee_children', employeeId] });
            onSuccess?.(res.detail);
            onClose();
        },
        onError: (err: Error) => onError?.(err.message),
    });

    const previewIso = watch('date');

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('addChild')}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 0.5, mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                        {getString('childBirthDate')}
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                        {formatDate(previewIso)}
                    </Typography>
                </Box>
                <Controller
                    name="date"
                    control={control}
                    render={({ field: f }) => (
                        <BirthDateWheelPicker value={f.value} onChange={f.onChange} />
                    )}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={mut.isPending}>
                    {getString('cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit((values) => {
                        if (values.date) mut.mutate(values.date);
                    })}
                    disabled={mut.isPending || !previewIso}
                >
                    {getString('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
