// src/components/employees/employee_events/EmployeeEventCreateDialog.tsx
import { useEffect } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import {
    fetchEmployeeEventTypes,
    fetchEmployeeEventStatuses,
    type EmployeeEventCreate,
    type EmployeeEventType,
    type EmployeeEventStatusSchema,
} from './employeeEventApi';
import type { GetStringFn } from '../../../types/getStringFn';
import { DATE_FORMAT } from '../../../utils/eNums';
import cfl from '../../../utils/helpers.ts';

interface FormValues {
    event_type_id: number | '';
    effective_date: string;
    description: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit: (payload: EmployeeEventCreate) => void;
    isPending: boolean;
    getString: GetStringFn;
    /** Whether the employee already has any event (drives activation-first filter). */
    hasAnyEvent: boolean;
    /** Effective dates already taken by existing events — cannot be reused. */
    existingDates?: string[];
}

export function EmployeeEventCreateDialog({
                                              open,
                                              onClose,
                                              onSubmit,
                                              isPending,
                                              getString,
                                              hasAnyEvent,
                                              existingDates = [],
                                          }: Props) {
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: {
            event_type_id: '',
            effective_date: dayjs().format('YYYY-MM-DD'),
            description: '',
        },
    });

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            reset({
                event_type_id: '',
                effective_date: dayjs().format('YYYY-MM-DD'),
                description: '',
            });
        }
    }, [open, reset]);

    // ── Lookups ───────────────────────────────────────────────────────────────
    const { data: eventTypes = [], isLoading: typesLoading } = useQuery<EmployeeEventType[]>({
        queryKey: ['employee-event-types'],
        queryFn: fetchEmployeeEventTypes,
        staleTime: 10 * 60 * 1000,
    });

    const { data: statuses = [] } = useQuery<EmployeeEventStatusSchema[]>({
        queryKey: ['employee-event-statuses'],
        queryFn: fetchEmployeeEventStatuses,
        staleTime: 10 * 60 * 1000,
    });

    // Find the "draft" status ID — events always start as draft
    const draftStatus = statuses.find((s) => s.name === 'draft');

    // The selected date cannot collide with an existing event's effective date.
    const selectedDate = useWatch({ control, name: 'effective_date' });
    const dateTaken = !!selectedDate && existingDates.includes(selectedDate);

    // Activation-first rule:
    // - No events yet  -> only ACTIVATION can be created.
    // - Events exist   -> ACTIVATION is hidden (it may exist only once, first).
    const selectableTypes = eventTypes.filter((et) =>
        hasAnyEvent ? et.code !== 'ACTIVATION' : et.code === 'ACTIVATION',
    );

    const onFormSubmit = (values: FormValues) => {
        if (!draftStatus) return;
        if (existingDates.includes(values.effective_date)) return; // duplicate date guard
        onSubmit({
            event_type_id: values.event_type_id as number,
            status_id: draftStatus.id,
            effective_date: values.effective_date,
            description: values.description || undefined,
            changes: [],
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('addEvent') || 'Add event')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    {/* Event Type */}
                    <Controller
                        name="event_type_id"
                        control={control}
                        rules={{ required: cfl(getString('fieldRequired') || 'Required') }}
                        render={({ field }) => (
                            <FormControl fullWidth error={!!errors.event_type_id} size="small">
                                <InputLabel>{cfl(getString('eventType') || 'Event type')}</InputLabel>
                                <Select
                                    {...field}
                                    label={cfl(getString('eventType') || 'Event type')}
                                    disabled={typesLoading}
                                >
                                    {selectableTypes.map((et) => (
                                        <MenuItem key={et.id} value={et.id}>
                                            {et.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.event_type_id && (
                                    <FormHelperText>{errors.event_type_id.message}</FormHelperText>
                                )}
                            </FormControl>
                        )}
                    />

                    {/* Effective Date — MUI calendar, DD.MM.YYYY */}
                    <Controller
                        name="effective_date"
                        control={control}
                        rules={{ required: cfl(getString('fieldRequired') || 'Required') }}
                        render={({ field }) => (
                            <DatePicker
                                label={cfl(getString('effectiveDate') || 'Effective date')}
                                format={DATE_FORMAT}
                                value={field.value ? dayjs(field.value) : null}
                                onChange={(v) => {
                                    const d = v ? dayjs(v) : null;
                                    field.onChange(d && d.isValid() ? d.format('YYYY-MM-DD') : '');
                                }}
                                shouldDisableDate={(d) =>
                                    existingDates.includes(dayjs(d).format('YYYY-MM-DD'))
                                }
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        error: !!errors.effective_date || dateTaken,
                                        helperText: dateTaken
                                            ? (getString('dateAlreadyUsed') ||
                                                'An event already exists on this date')
                                            : errors.effective_date?.message,
                                    },
                                }}
                            />
                        )}
                    />

                    {/* Description */}
                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label={cfl(getString('description') || 'Description')}
                                size="small"
                                fullWidth
                                multiline
                                minRows={2}
                                maxRows={4}
                            />
                        )}
                    />
                </LocalizationProvider>
            </DialogContent>

            <DialogActions>
                <Button variant="outlined" onClick={onClose} disabled={isPending}>
                    {cfl(getString('cancel') || 'Cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onFormSubmit)}
                    disabled={isPending || !draftStatus || dateTaken}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {cfl(getString('create') || 'Create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}