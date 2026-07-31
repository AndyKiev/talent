// src/components/person_events/LastNameChangeDialog.tsx
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import useString from '../../hooks/useString';
import { DATE_FORMAT } from '../../utils/eNums';
import type { LastNameChangeCreate } from './personEventApi';

const API_DATE = 'YYYY-MM-DD';

interface FormValues {
    new_last_name: string;
    effective_date: string;
}

interface Props {
    open: boolean;
    /** Current surname, shown so the author can see what is being replaced. */
    currentLastName: string | null;
    saving?: boolean;
    onClose: () => void;
    onSubmit: (data: LastNameChangeCreate) => void;
}

/**
 * Record a surname change from a given date.
 *
 * The date defaults to TODAY but is expected to be moved backwards: the change
 * is registered once the new document turns up, and "since when" is what the
 * history is for. No reason is collected — deliberately, per the business rule.
 *
 * Creating this only drafts an event; the person is renamed when it is applied.
 */
export default function LastNameChangeDialog({
    open,
    currentLastName,
    saving = false,
    onClose,
    onSubmit,
}: Props) {
    const getString = useString();
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: { new_last_name: '', effective_date: dayjs().format(API_DATE) },
    });

    // Mount-fresh: blank the form every time the dialog opens so a previous
    // attempt never bleeds into the next one.
    useEffect(() => {
        if (open) reset({ new_last_name: '', effective_date: dayjs().format(API_DATE) });
    }, [open, reset]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('recordLastNameChange')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2.5} sx={{ mt: 1 }}>
                    {currentLastName && (
                        <Typography variant="body2" color="text.secondary">
                            {getString('lastName')}: {currentLastName}
                        </Typography>
                    )}

                    <Controller
                        name="new_last_name"
                        control={control}
                        rules={{ required: 'newLastNameRequired' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label={getString('newLastName')}
                                fullWidth
                                size="small"
                                autoFocus
                                error={!!errors.new_last_name}
                                helperText={
                                    errors.new_last_name
                                        ? getString(errors.new_last_name.message ?? '')
                                        : ''
                                }
                            />
                        )}
                    />

                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Controller
                            name="effective_date"
                            control={control}
                            rules={{ required: 'changedSinceRequired' }}
                            render={({ field }) => (
                                <DatePicker
                                    label={getString('changedSince')}
                                    format={DATE_FORMAT}
                                    value={field.value ? dayjs(field.value, API_DATE) : null}
                                    onChange={(v) =>
                                        field.onChange(v ? dayjs(v).format(API_DATE) : '')
                                    }
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
                                            error: !!errors.effective_date,
                                            helperText: errors.effective_date
                                                ? getString(errors.effective_date.message ?? '')
                                                : '',
                                        },
                                    }}
                                />
                            )}
                        />
                    </LocalizationProvider>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{getString('cancel')}</Button>
                <Button
                    variant="contained"
                    disabled={saving}
                    onClick={handleSubmit((v) =>
                        onSubmit({
                            new_last_name: v.new_last_name,
                            effective_date: v.effective_date,
                        }),
                    )}
                >
                    {getString('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
