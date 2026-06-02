// src/components/employees/employee_events/EmployeeEventCreateDialog.tsx
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import {
    fetchEmployeeEventTypes,
    fetchEmployeeEventStatuses,
    type EmployeeEventCreate,
    type EmployeeEventType,
    type EmployeeEventStatusSchema,
} from './employeeEventApi';
import type { GetStringFn } from '../../../types/getStringFn';
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
}

export function EmployeeEventCreateDialog({
    open,
    onClose,
    onSubmit,
    isPending,
    getString,
    hasAnyEvent,
}: Props) {
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: {
            event_type_id: '',
            effective_date: new Date().toISOString().slice(0, 10),
            description: '',
        },
    });

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            reset({
                event_type_id: '',
                effective_date: new Date().toISOString().slice(0, 10),
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

    // Activation-first rule:
    // - No events yet  -> only ACTIVATION can be created.
    // - Events exist   -> ACTIVATION is hidden (it may exist only once, first).
    const selectableTypes = eventTypes.filter((et) =>
        hasAnyEvent ? et.code !== 'ACTIVATION' : et.code === 'ACTIVATION',
    );

    const onFormSubmit = (values: FormValues) => {
        if (!draftStatus) return;
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

                {/* Effective Date */}
                <Controller
                    name="effective_date"
                    control={control}
                    rules={{ required: cfl(getString('fieldRequired') || 'Required') }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            type="date"
                            label={cfl(getString('effectiveDate') || 'Effective date')}
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            error={!!errors.effective_date}
                            helperText={errors.effective_date?.message}
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
            </DialogContent>

            <DialogActions>
                <Button variant="outlined" onClick={onClose} disabled={isPending}>
                    {cfl(getString('cancel') || 'Cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onFormSubmit)}
                    disabled={isPending || !draftStatus}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {cfl(getString('create') || 'Create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
