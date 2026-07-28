import { useEffect } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import MissionDurationWheel from './MissionDurationWheel';
import { monthsBetween, previewEndDate } from './missionHelpers';
import type { Mission, MissionDimensionOption } from './missionApi';
import type { GetStringFn } from '../../types/getStringFn';
import { DATE_FORMAT } from '../../utils/eNums';

const API_DATE = 'YYYY-MM-DD';
/** Sensible starting duration — a year is the common development horizon. */
const DEFAULT_DURATION_MONTHS = 12;

interface MissionFormValues {
    text: string;
    start_date: string;
    duration_months: number;
    dimension_id: number | '';
    kpis: { id: number | null; text: string }[];
}

interface Props {
    open: boolean;
    onClose: () => void;
    /** null = create, otherwise edit that mission. */
    mission: Mission | null;
    dimensionOptions: MissionDimensionOption[];
    maxMonths: number;
    kpiMaxLength: number;
    /** Cap from the `mission_max_kpis` app setting. */
    maxKpis: number;
    getString: GetStringFn;
    onCreate: (values: {
        text: string;
        start_date: string;
        duration_months: number;
        dimension_id: number | null;
        kpis: { text: string }[];
    }) => void;
    onUpdate: (values: {
        text: string;
        start_date: string;
        duration_months: number;
        dimension_id: number | null;
    }) => void;
    isSaving: boolean;
}

/**
 * Create / edit a development mission.
 *
 * Date convention (project standard): start date via the MUI <DatePicker>
 * displaying DD.MM.YYYY and storing 'YYYY-MM-DD'; duration via a scroll wheel;
 * the end date is NOT an input — it is previewed read-only and computed by the
 * server, which stays authoritative.
 *
 * Layout note: the duration wheel is ~180px tall while a text field is ~56px, so
 * putting it beside a single field leaves a large dead gap next to it. The left
 * column therefore stacks start date + computed end date + competence, which
 * together match the wheel's height and fill that space.
 *
 * On CREATE the KPI list is part of the payload (a mission must have at least
 * one, so the last row's remove button is disabled) and sits in a narrower right
 * column beside the description. On EDIT the KPI rows are managed individually
 * from the mission card — each carries its own fulfilment percentage and change
 * history — so the description takes the full width instead.
 */
export function MissionFormDialog({
    open,
    onClose,
    mission,
    dimensionOptions,
    maxMonths,
    kpiMaxLength,
    maxKpis,
    getString,
    onCreate,
    onUpdate,
    isSaving,
}: Props) {
    const isEdit = mission !== null;

    const { control, handleSubmit, reset } = useForm<MissionFormValues>({
        defaultValues: {
            text: '',
            start_date: dayjs().format(API_DATE),
            duration_months: DEFAULT_DURATION_MONTHS,
            dimension_id: '',
            kpis: [{ id: null, text: '' }],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'kpis' });

    // Mount-fresh: refill from the mission (or blank) every time the dialog
    // opens, so a previous edit never bleeds into the next one.
    useEffect(() => {
        if (!open) return;
        reset({
            text: mission?.text ?? '',
            start_date: mission?.start_date ?? dayjs().format(API_DATE),
            duration_months: mission
                ? monthsBetween(mission.start_date, mission.end_date) ||
                  DEFAULT_DURATION_MONTHS
                : DEFAULT_DURATION_MONTHS,
            dimension_id: mission?.dimension_id ?? '',
            kpis: [{ id: null, text: '' }],
        });
    }, [open, mission, reset]);

    const startDate = useWatch({ control, name: 'start_date' });
    const durationMonths = useWatch({ control, name: 'duration_months' });
    const missionText = useWatch({ control, name: 'text' });
    const kpiRows = useWatch({ control, name: 'kpis' });

    const submit = handleSubmit((values) => {
        const dimensionId = values.dimension_id === '' ? null : Number(values.dimension_id);
        if (isEdit) {
            onUpdate({
                text: values.text.trim(),
                start_date: values.start_date,
                duration_months: values.duration_months,
                dimension_id: dimensionId,
            });
            return;
        }
        onCreate({
            text: values.text.trim(),
            start_date: values.start_date,
            duration_months: values.duration_months,
            dimension_id: dimensionId,
            kpis: values.kpis
                .map((k) => ({ text: k.text.trim() }))
                .filter((k) => k.text.length > 0),
        });
    });

    const kpisValid = isEdit || kpiRows.some((k) => k.text.trim().length > 0);
    const canSubmit = missionText.trim().length > 0 && !!startDate && kpisValid;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{getString(isEdit ? 'editMission' : 'addMission')}</DialogTitle>
            <DialogContent>
                {/* Description (2fr) beside the KPI column (1fr) on create. */}
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems="stretch"
                    sx={{ mt: 1 }}
                >
                    <Box sx={{ flex: 2 }}>
                        <Controller
                            name="text"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label={getString('missionText')}
                                    placeholder={getString('typeMissionPlaceholder')}
                                    multiline
                                    minRows={5}
                                    fullWidth
                                />
                            )}
                        />
                    </Box>

                    {!isEdit && (
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* No caption: the placeholder carries the label, the
                                same way the mission description does. Numbered
                                only once there is more than one to tell apart. */}
                            <Stack spacing={1}>
                                {fields.map((row, index) => (
                                    <Stack key={row.id} direction="row" spacing={0.5}>
                                        <Controller
                                            name={`kpis.${index}.text`}
                                            control={control}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    size="small"
                                                    placeholder={
                                                        fields.length > 1
                                                            ? `KPI_${index + 1}`
                                                            : 'KPI'
                                                    }
                                                    inputProps={{ maxLength: kpiMaxLength }}
                                                    multiline
                                                    minRows={3}
                                                    maxRows={6}
                                                    fullWidth
                                                />
                                            )}
                                        />
                                        <Tooltip title={getString('deleteKpi')}>
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => remove(index)}
                                                    disabled={fields.length <= 1}
                                                >
                                                    <CloseIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Stack>
                                ))}
                            </Stack>
                            {/* Hidden at the cap — the backend refuses beyond it
                                anyway, so showing the button would only produce
                                an error the user cannot act on. */}
                            {fields.length < maxKpis && (
                                <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => append({ id: null, text: '' })}
                                    sx={{ textTransform: 'none', mt: 0.5 }}
                                >
                                    {getString('addKpi')}
                                </Button>
                            )}
                        </Box>
                    )}
                </Stack>

                {/* Period. The left stack is sized to match the wheel's height so
                    no dead space is left beside it. */}
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    {/* Same 2:1 split as the row above, so the date column lines
                        up under the description and the wheel under the KPIs. */}
                    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mt: 2.5 }}>
                        <Stack spacing={2} sx={{ flex: 2 }}>
                            <Controller
                                name="start_date"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        label={getString('missionStartDate')}
                                        format={DATE_FORMAT}
                                        value={field.value ? dayjs(field.value, API_DATE) : null}
                                        onChange={(v) =>
                                            field.onChange(v ? dayjs(v).format(API_DATE) : '')
                                        }
                                        slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                    />
                                )}
                            />

                            <Typography variant="body2">
                                {getString('missionEndDate')}:{' '}
                                <Box component="span" fontWeight={600}>
                                    {previewEndDate(startDate, durationMonths)}
                                </Box>
                            </Typography>

                            <Controller
                                name="dimension_id"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth size="small" variant="outlined">
                                        <InputLabel shrink>
                                            {getString('missionCompetence')}
                                        </InputLabel>
                                        <Select
                                            {...field}
                                            variant="outlined"
                                            label={getString('missionCompetence')}
                                            notched
                                            displayEmpty
                                        >
                                            <MenuItem value="">
                                                <em>{getString('missionNoCompetence')}</em>
                                            </MenuItem>
                                            {dimensionOptions.map((o) => (
                                                <MenuItem
                                                    key={o.id}
                                                    value={o.id}
                                                    sx={{ color: o.color, fontWeight: 600 }}
                                                >
                                                    {o.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}
                            />
                        </Stack>

                        <Box sx={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary">
                                {getString('missionDurationMonths')}
                            </Typography>
                            <Controller
                                name="duration_months"
                                control={control}
                                render={({ field }) => (
                                    <MissionDurationWheel
                                        value={field.value}
                                        onChange={field.onChange}
                                        maxMonths={maxMonths}
                                    />
                                )}
                            />
                        </Box>
                    </Stack>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    {getString('cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={submit}
                    disabled={!canSubmit || isSaving}
                    sx={{ textTransform: 'none' }}
                >
                    {getString('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
