import {
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
} from '@mui/material';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
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
}

/** Job-info tab: job / department / dates and the employee's current competency level. */
export function JobInfoPanel({
    getString,
    jobName, departmentName, hireDate, employeeTenure,
    jobAssignedDate, positionDuration, showEdit,
    onEditHire, onEditJobAssigned,
    levels, currentLevelId, onCurrentLevelChange, currentLevelDisabled,
}: Props) {
    const { t } = useTheme();
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

            {/* Current competency level */}
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
        </Stack>
    );
}
