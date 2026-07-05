import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';
import BirthDateWheelPicker from './BirthDateWheelPicker';
import { patchEmployeePersonalData } from '../peopleReviewApi';
import type { GetStringFn } from '../../../types/getStringFn';
import { formatDate } from '../../../utils/date';

type DateField = 'birth_date' | 'hire_date' | 'job_assigned_date';

interface FormValues {
    date: string | null; // ISO 'YYYY-MM-DD'
}

// Generic edit dialog for a single personal-data date field (birth / hire),
// using the 3-wheel date picker. Patches only that field.
export default function EmployeeDateDialog({
    open,
    onClose,
    employeeId,
    field,
    value,
    titleKey,
    labelKey,
    getString,
    onError,
    onSaved,
    minYear,
    maxYear,
}: {
    open: boolean;
    onClose: () => void;
    employeeId: number;
    field: DateField;
    value: string | null;
    titleKey: string;
    labelKey: string;
    getString: GetStringFn;
    onError?: (message: string) => void;
    // Called after a successful save so the parent can refresh its source (the
    // personal-data facts live on the people-review RSE detail, not a dedicated
    // query here).
    onSaved?: () => Promise<void> | void;
    minYear?: number;
    maxYear?: number;
}) {
    const { control, handleSubmit, reset, watch } = useForm<FormValues>({
        defaultValues: { date: value },
    });

    // Re-seed the form whenever the dialog (re)opens.
    useEffect(() => {
        if (open) reset({ date: value });
    }, [open, value, reset]);

    const mut = useMutation({
        mutationFn: (iso: string | null) =>
            patchEmployeePersonalData(employeeId, { [field]: iso }),
        onSuccess: async () => {
            await onSaved?.();
            onClose();
        },
        onError: (err: Error) => onError?.(err.message),
    });

    const previewIso = watch('date');

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{getString(titleKey)}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 0.5, mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                        {getString(labelKey)}
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                        {formatDate(previewIso)}
                    </Typography>
                </Box>
                <Controller
                    name="date"
                    control={control}
                    render={({ field: f }) => (
                        <BirthDateWheelPicker
                            value={f.value}
                            onChange={f.onChange}
                            minYear={minYear}
                            maxYear={maxYear}
                        />
                    )}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={mut.isPending}>
                    {getString('cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit((values) => mut.mutate(values.date))}
                    disabled={mut.isPending}
                >
                    {getString('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
