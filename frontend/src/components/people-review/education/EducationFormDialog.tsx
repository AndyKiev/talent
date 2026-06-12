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
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import YearWheelPicker from './YearWheelPicker';
import {
    createEmployeeEducation,
    updateEmployeeEducation,
    type EducationDegree,
    type EmployeeEducation,
    type EmployeeEducationInput,
} from '../peopleReviewApi';
import type { GetStringFn } from '../../../types/getStringFn';

interface FormValues {
    institution: string;
    degree_id: number | null;
    speciality: string;
    graduation_year: number | null;
}

const toForm = (e: EmployeeEducation | null): FormValues => ({
    institution: e?.institution ?? '',
    degree_id: e?.degree_id ?? null,
    speciality: e?.speciality ?? '',
    graduation_year: e?.graduation_year ?? null,
});

export default function EducationFormDialog({
    open,
    onClose,
    employeeId,
    editing,
    degrees,
    getString,
    onSuccess,
    onError,
}: {
    open: boolean;
    onClose: () => void;
    employeeId: number;
    editing: EmployeeEducation | null;
    degrees: EducationDegree[];
    getString: GetStringFn;
    onSuccess?: (message: string) => void;
    onError?: (message: string) => void;
}) {
    const qc = useQueryClient();
    const { control, handleSubmit, reset } = useForm<FormValues>({
        defaultValues: toForm(editing),
    });

    useEffect(() => {
        if (open) reset(toForm(editing));
    }, [open, editing, reset]);

    const mut = useMutation({
        mutationFn: (values: FormValues) => {
            const payload: EmployeeEducationInput = {
                institution: values.institution.trim(),
                degree_id: values.degree_id,
                speciality: values.speciality.trim() || null,
                graduation_year: values.graduation_year,
            };
            return editing
                ? updateEmployeeEducation(editing.id, payload)
                : createEmployeeEducation(employeeId, payload);
        },
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['employee_educations', employeeId] });
            onSuccess?.(res.detail);
            onClose();
        },
        onError: (err: Error) => onError?.(err.message),
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{getString(editing ? 'editEducation' : 'addEducation')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 0.5 }}>
                    <Controller
                        name="institution"
                        control={control}
                        rules={{ required: true }}
                        render={({ field, fieldState }) => (
                            <TextField
                                {...field}
                                label={getString('institution')}
                                size="small"
                                fullWidth
                                error={!!fieldState.error}
                            />
                        )}
                    />
                    <Controller
                        name="degree_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl size="small" fullWidth>
                                <InputLabel>{getString('degree')}</InputLabel>
                                <Select
                                    variant="outlined"
                                    label={getString('degree')}
                                    value={field.value != null ? String(field.value) : ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : Number(e.target.value))
                                    }
                                >
                                    {degrees.map((d) => (
                                        <MenuItem key={d.id} value={String(d.id)}>
                                            {getString(d.name_key)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    />
                    <Controller
                        name="speciality"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label={getString('speciality')}
                                size="small"
                                fullWidth
                            />
                        )}
                    />
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {getString('graduationYear')}
                        </Typography>
                        <Controller
                            name="graduation_year"
                            control={control}
                            render={({ field }) => (
                                <YearWheelPicker value={field.value} onChange={field.onChange} />
                            )}
                        />
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={mut.isPending}>
                    {getString('cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit((v) => mut.mutate(v))}
                    disabled={mut.isPending}
                >
                    {getString('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
