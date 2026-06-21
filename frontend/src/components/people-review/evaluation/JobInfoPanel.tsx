import {
    Box,
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Typography,
} from '@mui/material';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import type { GetStringFn } from '../../../types/getStringFn';
import { useTheme } from '../../theme/ThemeContext';
import { formatDate } from '../../../utils/date';
import type { ReviewLevelLite } from '../peopleReviewApi';
import { FactItem } from './FactItem';

interface Props {
    getString: GetStringFn;
    // Job facts
    jobName: string | null | undefined;
    departmentName: string | null | undefined;
    hireDate: string | null | undefined;
    employeeTenure: number | null;
    jobAssignedDate: string | null | undefined;
    positionDuration: string | null;
    /** Whether the inline hire / job-assigned date edit pencils are shown. */
    showEdit: boolean;
    onEditHire: () => void;
    onEditJobAssigned: () => void;
    // Current competency level
    levels: ReviewLevelLite[];
    currentLevelId: number | null;
    onCurrentLevelChange: (levelId: number) => void;
    currentLevelDisabled: boolean;
    // Proposed level (opens the drawer); name of the saved proposed level, if any.
    onOpenProposed: () => void;
    proposedLevelName: string | null;
    // How the proposed level compares to the current one (null when not both set).
    proposedLevelSense: 'increase' | 'same' | 'decrease' | null;
}

// Icon + colour + comment-key per level sense, shown above/inside the proposed chip.
const SENSE_META: Record<
    'increase' | 'same' | 'decrease',
    { icon: typeof TrendingUpIcon; color: string; labelKey: string }
> = {
    increase: { icon: TrendingUpIcon, color: '#2E7D32', labelKey: 'levelSenseIncrease' },
    same: { icon: TrendingFlatIcon, color: '#1565C0', labelKey: 'levelSenseSame' },
    decrease: { icon: TrendingDownIcon, color: '#C62828', labelKey: 'levelSenseDecrease' },
};

/** Job-info tab: job / department / dates and the employee's current competency level. */
export function JobInfoPanel({
    getString,
    jobName, departmentName, hireDate, employeeTenure,
    jobAssignedDate, positionDuration, showEdit,
    onEditHire, onEditJobAssigned,
    levels, currentLevelId, onCurrentLevelChange, currentLevelDisabled,
    onOpenProposed, proposedLevelName, proposedLevelSense,
}: Props) {
    const { t } = useTheme();
    const sense = proposedLevelSense ? SENSE_META[proposedLevelSense] : null;
    const SenseIcon = sense?.icon;
    return (
        <Stack spacing={2.5}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, rowGap: 1.5 }}>
                <FactItem
                    icon={<WorkOutlineIcon sx={{ fontSize: 18, color: t.textMuted }} />}
                    label={getString('job')}
                    value={jobName ?? '—'}
                />
                <FactItem
                    icon={<ApartmentIcon sx={{ fontSize: 18, color: t.textMuted }} />}
                    label={getString('department')}
                    value={departmentName ?? '—'}
                />
                <FactItem
                    icon={<BusinessOutlinedIcon sx={{ fontSize: 18, color: t.textMuted }} />}
                    label={getString('hireDate')}
                    value={<>{formatDate(hireDate ?? null)}{employeeTenure !== null && ` · ${getString('yearsWithCompany', { years: employeeTenure })}`}</>}
                    onEdit={showEdit ? onEditHire : undefined}
                    editTitle={getString('editHireDate')}
                />
                <FactItem
                    icon={<EventAvailableOutlinedIcon sx={{ fontSize: 18, color: t.textMuted }} />}
                    label={getString('jobAssignedDate')}
                    value={<>{formatDate(jobAssignedDate ?? null)}{positionDuration && ` · ${positionDuration}`}</>}
                    onEdit={showEdit ? onEditJobAssigned : undefined}
                    editTitle={getString('editJobAssignedDate')}
                />
            </Box>

            {/* Current competency level + proposed level (drawer) */}
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" rowGap={1}>
                <FormControl size="small" sx={{ minWidth: 200, maxWidth: 280 }}>
                    <InputLabel>{getString('currentLevel')}</InputLabel>
                    <Select
                        variant="outlined"
                        label={getString('currentLevel')}
                        value={currentLevelId ? String(currentLevelId) : ''}
                        onChange={(e) => onCurrentLevelChange(Number(e.target.value))}
                        disabled={currentLevelDisabled}
                    >
                        {levels
                            .slice()
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((lvl) => (
                                <MenuItem key={lvl.id} value={String(lvl.id)}>
                                    {getString(lvl.name_key)}
                                </MenuItem>
                            ))}
                    </Select>
                </FormControl>

                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<TrendingUpIcon />}
                    onClick={onOpenProposed}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                >
                    {getString('proposedLevel')}
                </Button>
                {proposedLevelName && (
                    // Comment (the level "sense") sits over the chip; the chip itself
                    // carries the matching sense icon + the proposed level name.
                    <Stack spacing={0.25} alignItems="flex-start">
                        {sense && SenseIcon && (
                            <Typography fontSize={11} fontWeight={700} sx={{ color: sense.color, lineHeight: 1.2 }}>
                                {getString(sense.labelKey)}
                            </Typography>
                        )}
                        <Chip
                            size="small"
                            icon={SenseIcon ? <SenseIcon sx={{ fontSize: 16, color: `${sense!.color} !important` }} /> : undefined}
                            label={proposedLevelName}
                            sx={{
                                fontWeight: 700,
                                fontSize: 12,
                                bgcolor: sense ? `${sense.color}18` : `${t.accent}18`,
                                color: sense ? sense.color : t.accent,
                            }}
                        />
                    </Stack>
                )}
            </Stack>
        </Stack>
    );
}
