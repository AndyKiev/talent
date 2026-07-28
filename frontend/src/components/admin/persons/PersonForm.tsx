// src/components/admin/persons/PersonForm.tsx
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Alert,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import type { UseMutationResult } from '@tanstack/react-query';
import {
    maritalWordKey,
    PersonSex,
    type PersonCreate,
    type MutationResponse,
    type Person,
    type PersonMaritalStatus,
} from './personApi';
import { DATE_FORMAT } from '../../../utils/eNums';
import useString from '../../../hooks/useString.ts';
import cfl from '../../../utils/helpers.ts';

const schema = z.object({
    last_name: z.string().min(1, 'fieldRequired').max(64, 'nameTooLong'),
    first_name: z.string().min(1, 'fieldRequired').max(64, 'nameTooLong'),
    patronymic: z.string().max(64, 'nameTooLong').optional().or(z.literal('')),
    sex: z.union([z.enum(PersonSex), z.literal('')]),
    marital_status: z.union([z.literal('married'), z.literal('not_married'), z.literal('')]),
    birth_date: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<Person>, Error, PersonCreate>;
}

export function PersonForm({ open, onClose, createMutation }: Props) {
    const getString = useString();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            last_name: '',
            first_name: '',
            patronymic: '',
            sex: '',
            marital_status: '',
            birth_date: '',
        },
    });

    const sexValue = useWatch({ control, name: 'sex' });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            last_name: data.last_name.trim(),
            first_name: data.first_name.trim(),
            patronymic: data.patronymic?.trim() || null,
            sex: (data.sex || null) as PersonSex | null,
            marital_status: (data.marital_status || null) as PersonMaritalStatus | null,
            birth_date: data.birth_date || null,
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('createPerson') || 'Create Person')}</DialogTitle>
            <DialogContent>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        {createMutation.isError && (
                            <Alert severity="error">{createMutation.error?.message}</Alert>
                        )}
                        <TextField
                            label={cfl(getString('lastName') || 'Last name')}
                            required
                            fullWidth
                            slotProps={{ htmlInput: { maxLength: 64 } }}
                            error={!!errors.last_name}
                            helperText={
                                errors.last_name?.message &&
                                (getString(errors.last_name.message) || errors.last_name.message)
                            }
                            {...register('last_name')}
                        />
                        <TextField
                            label={cfl(getString('firstName') || 'First name')}
                            required
                            fullWidth
                            slotProps={{ htmlInput: { maxLength: 64 } }}
                            error={!!errors.first_name}
                            helperText={
                                errors.first_name?.message &&
                                (getString(errors.first_name.message) || errors.first_name.message)
                            }
                            {...register('first_name')}
                        />
                        <TextField
                            label={cfl(getString('patronymic') || 'Patronymic')}
                            fullWidth
                            slotProps={{ htmlInput: { maxLength: 64 } }}
                            error={!!errors.patronymic}
                            helperText={
                                errors.patronymic?.message &&
                                (getString(errors.patronymic.message) || errors.patronymic.message)
                            }
                            {...register('patronymic')}
                        />
                        <Controller
                            name="sex"
                            control={control}
                            render={({ field }) => (
                                <FormControl fullWidth>
                                    <InputLabel id="person-sex-label">
                                        {cfl(getString('sex') || 'Sex')}
                                    </InputLabel>
                                    <Select
                                        {...field}
                                        labelId="person-sex-label"
                                        variant="outlined"
                                        label={cfl(getString('sex') || 'Sex')}
                                    >
                                        <MenuItem value="">—</MenuItem>
                                        <MenuItem value={PersonSex.Male}>{getString('sexMale') || 'Male'}</MenuItem>
                                        <MenuItem value={PersonSex.Female}>{getString('sexFemale') || 'Female'}</MenuItem>
                                    </Select>
                                </FormControl>
                            )}
                        />
                        {/* Marital options are worded per the chosen sex — pick sex first. */}
                        <Controller
                            name="marital_status"
                            control={control}
                            render={({ field }) => (
                                <FormControl fullWidth disabled={!sexValue}>
                                    <InputLabel id="person-marital-label">
                                        {cfl(getString('maritalStatus') || 'Marital status')}
                                    </InputLabel>
                                    <Select
                                        {...field}
                                        labelId="person-marital-label"
                                        variant="outlined"
                                        label={cfl(getString('maritalStatus') || 'Marital status')}
                                    >
                                        <MenuItem value="">—</MenuItem>
                                        <MenuItem value="married">
                                            {sexValue ? getString(maritalWordKey(sexValue, 'married')) : ''}
                                        </MenuItem>
                                        <MenuItem value="not_married">
                                            {sexValue ? getString(maritalWordKey(sexValue, 'not_married')) : ''}
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                            )}
                        />
                        <Controller
                            name="birth_date"
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    label={cfl(getString('birthDate') || 'Birth date')}
                                    format={DATE_FORMAT}
                                    value={field.value ? dayjs(field.value) : null}
                                    onChange={(v) => {
                                        const d = v ? dayjs(v) : null;
                                        field.onChange(d && d.isValid() ? d.format('YYYY-MM-DD') : '');
                                    }}
                                    slotProps={{ textField: { fullWidth: true } }}
                                />
                            )}
                        />
                    </Box>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={handleClose} disabled={createMutation.isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={createMutation.isPending}
                    startIcon={
                        createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined
                    }
                >
                    {getString('create') || 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
