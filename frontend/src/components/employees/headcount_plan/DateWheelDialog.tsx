// src/components/employees/headcount_plan/DateWheelDialog.tsx
//
// Generic single-date pick dialog on the iOS-style wheel picker — a decoupled
// sibling of EmployeeDateDialog (which is hardwired to personal-data PATCH).
// The caller receives the chosen ISO date via onSave and persists it itself.
import { useEffect } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';
import DateWheelPicker from '../../people-review/personal-data/DateWheelPicker';
import type { GetStringFn } from '../../../types/getStringFn';
import { formatDate } from '../../../utils/date';

interface FormValues {
    date: string | null; // ISO 'YYYY-MM-DD'
}

export default function DateWheelDialog({
    open,
    onClose,
    value,
    titleKey,
    getString,
    onSave,
    minYear,
    maxYear,
}: {
    open: boolean;
    onClose: () => void;
    value: string | null;
    titleKey: string;
    getString: GetStringFn;
    onSave: (iso: string) => void;
    minYear?: number;
    maxYear?: number;
}) {
    const { control, handleSubmit, reset } = useForm<FormValues>({
        defaultValues: { date: value },
    });

    // Re-seed the form whenever the dialog (re)opens.
    useEffect(() => {
        if (open) reset({ date: value });
    }, [open, value, reset]);

    // useWatch (not watch()) so React Compiler can memoize this component.
    const previewIso = useWatch({ control, name: 'date' });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{getString(titleKey)}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 0.5, mb: 1.5 }}>
                    <Typography variant="h6" fontWeight={700}>
                        {formatDate(previewIso)}
                    </Typography>
                </Box>
                <Controller
                    name="date"
                    control={control}
                    render={({ field: f }) => (
                        <DateWheelPicker
                            value={f.value}
                            onChange={f.onChange}
                            minYear={minYear}
                            maxYear={maxYear}
                        />
                    )}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{getString('cancel')}</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit((values) => {
                        if (values.date) onSave(values.date);
                        onClose();
                    })}
                >
                    {getString('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
