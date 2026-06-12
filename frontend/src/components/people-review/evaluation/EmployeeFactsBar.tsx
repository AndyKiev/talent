import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import ApartmentIcon from '@mui/icons-material/Apartment';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import type { GetStringFn } from '../../../types/getStringFn';
import { useTheme } from '../../theme/ThemeContext';
import { formatDate } from '../../../utils/date';

interface Props {
    jobName: string | null | undefined;
    departmentName: string | null | undefined;
    birthDate: string | null | undefined;
    hireDate: string | null | undefined;
    jobAssignedDate: string | null | undefined;
    employeeAge: number | null;
    employeeTenure: number | null;
    positionDuration: string | null;
    /** Whether the inline edit (pencil) buttons are shown — true when an employee id is known. */
    showEdit: boolean;
    getString: GetStringFn;
    onEditBirth: () => void;
    onEditHire: () => void;
    onEditJobAssigned: () => void;
}

/** The job / department / birth / hire / job-assigned facts row above the tabs. */
export function EmployeeFactsBar({
    jobName, departmentName, birthDate, hireDate, jobAssignedDate,
    employeeAge, employeeTenure, positionDuration, showEdit, getString,
    onEditBirth, onEditHire, onEditJobAssigned,
}: Props) {
    const { t } = useTheme();
    return (
        <Box
            sx={{
                mb: 2.5,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 2,
                rowGap: 1.5,
            }}
        >
            {/* Job */}
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                <WorkOutlineIcon sx={{ fontSize: 18, color: t.textMuted }} />
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color={t.textMuted} sx={{ display: 'block', lineHeight: 1.1 }}>
                        {getString('job')}
                    </Typography>
                    <Typography variant="body2" color={t.text} fontWeight={600} noWrap>
                        {jobName ?? '—'}
                    </Typography>
                </Box>
            </Stack>

            {/* Department (main) */}
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                <ApartmentIcon sx={{ fontSize: 18, color: t.textMuted }} />
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color={t.textMuted} sx={{ display: 'block', lineHeight: 1.1 }}>
                        {getString('department')}
                    </Typography>
                    <Typography variant="body2" color={t.text} fontWeight={600} noWrap>
                        {departmentName ?? '—'}
                    </Typography>
                </Box>
            </Stack>

            {/* Birth date / age */}
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                <CakeOutlinedIcon sx={{ fontSize: 18, color: t.textMuted }} />
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color={t.textMuted} sx={{ display: 'block', lineHeight: 1.1 }}>
                        {getString('birthDate')}
                    </Typography>
                    <Stack direction="row" spacing={0.25} alignItems="center">
                        <Typography variant="body2" color={t.text} fontWeight={600} noWrap>
                            {formatDate(birthDate ?? null)}
                            {employeeAge !== null && ` · ${getString('yearsOld', { age: employeeAge })}`}
                        </Typography>
                        {showEdit && (
                            <Tooltip title={getString('editBirthDate')} placement="top">
                                <IconButton size="small" onClick={onEditBirth} sx={{ p: 0.2 }}>
                                    <EditCalendarIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Box>
            </Stack>

            {/* Hire date / tenure */}
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                <BusinessOutlinedIcon sx={{ fontSize: 18, color: t.textMuted }} />
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color={t.textMuted} sx={{ display: 'block', lineHeight: 1.1 }}>
                        {getString('hireDate')}
                    </Typography>
                    <Stack direction="row" spacing={0.25} alignItems="center">
                        <Typography variant="body2" color={t.text} fontWeight={600} noWrap>
                            {formatDate(hireDate ?? null)}
                            {employeeTenure !== null && ` · ${getString('yearsWithCompany', { years: employeeTenure })}`}
                        </Typography>
                        {showEdit && (
                            <Tooltip title={getString('editHireDate')} placement="top">
                                <IconButton size="small" onClick={onEditHire} sx={{ p: 0.2 }}>
                                    <EditCalendarIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Box>
            </Stack>

            {/* Job-assigned date / time in position */}
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                <EventAvailableOutlinedIcon sx={{ fontSize: 18, color: t.textMuted }} />
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color={t.textMuted} sx={{ display: 'block', lineHeight: 1.1 }}>
                        {getString('jobAssignedDate')}
                    </Typography>
                    <Stack direction="row" spacing={0.25} alignItems="center">
                        <Typography variant="body2" color={t.text} fontWeight={600} noWrap>
                            {formatDate(jobAssignedDate ?? null)}
                            {positionDuration && ` · ${positionDuration}`}
                        </Typography>
                        {showEdit && (
                            <Tooltip title={getString('editJobAssignedDate')} placement="top">
                                <IconButton size="small" onClick={onEditJobAssigned} sx={{ p: 0.2 }}>
                                    <EditCalendarIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
}
