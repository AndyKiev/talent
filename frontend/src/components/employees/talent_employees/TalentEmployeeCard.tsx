// src/components/employees/talent_employees/TalentEmployeeCard.tsx
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    Divider,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import EmployeeAvatar from '../../ui/EmployeeAvatar';
import type { RosterRow, RosterTalent } from './talentEmployeesApi';
import { TalentRowActions } from './TalentRowActions';
import { TalentLineActions } from './TalentLineActions';
import { effectiveLabel, talentSourceTooltip, type TalentRowHandlers } from './talentRowHandlers';

interface Props {
    row: RosterRow;
    handlers: TalentRowHandlers;
    onOpen: (row: RosterRow) => void;
}

function TalentLine({ row, talent, handlers }: { row: RosterRow; talent: RosterTalent; handlers: TalentRowHandlers }) {
    const getString = useString();
    return (
        <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography fontSize={12.5} fontWeight={600} noWrap title={talent.job_name}>
                    {talent.job_name}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Tooltip title={talentSourceTooltip(talent, getString)}>
                        <Chip label={effectiveLabel(talent)} size="small" color="primary" variant="outlined" />
                    </Tooltip>
                    <Typography fontSize={10.5} color="text.secondary">
                        {getString(talent.is_hrs ? 'hrsShort' : 'hrmShort')}
                    </Typography>
                    <Typography fontSize={11} color="text.secondary">
                        {talent.job_status_name}
                        {talent.interview_date ? ` · ${formatToUkrDate(talent.interview_date)}` : ''}
                    </Typography>
                </Stack>
            </Box>
            <TalentLineActions row={row} talent={talent} handlers={handlers} />
        </Stack>
    );
}

// Card view of one talent employee: identity + main talent always visible,
// the other talents inside an accordion, and the same actions as the grid.
export function TalentEmployeeCard({ row, handlers, onOpen }: Props) {
    const getString = useString();
    const [main, ...rest] = row.talents;
    return (
        <Card variant="outlined">
            <CardActionArea onClick={() => onOpen(row)}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <EmployeeAvatar employeeId={row.employee_id} name={row.name} scope="employeesMenu" size={40} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography fontSize={13} fontWeight={600} noWrap>
                                {row.name}
                            </Typography>
                            <Typography fontSize={11.5} color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                {row.code}
                            </Typography>
                        </Box>
                        {row.status_name && (
                            <Chip label={cfl(getString(row.status_name))} size="small" variant="outlined" />
                        )}
                    </Stack>
                    <Stack direction="row" spacing={0.5} mt={1.25} flexWrap="wrap" useFlexGap>
                        {row.main_department_name && (
                            <Chip label={row.main_department_name} size="small" color="success" variant="outlined" />
                        )}
                        {row.job_name && <Chip label={row.job_name} size="small" color="primary" variant="outlined" />}
                    </Stack>
                </CardContent>
            </CardActionArea>
            <Divider />
            <Box sx={{ px: 1.5, py: 1 }}>
                {main ? (
                    <TalentLine row={row} talent={main} handlers={handlers} />
                ) : (
                    <Typography fontSize={12} color="text.secondary">
                        {cfl(getString('noTalents'))}
                    </Typography>
                )}
            </Box>
            {rest.length > 0 && (
                <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 36, px: 1.5 }}>
                        <Typography fontSize={12} color="text.secondary">
                            {cfl(getString('showAllTalents'))} (+{rest.length})
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, px: 1.5 }}>
                        <Stack spacing={1} divider={<Divider flexItem />}>
                            {rest.map((t) => (
                                <TalentLine key={t.talent_audit_job_id} row={row} talent={t} handlers={handlers} />
                            ))}
                        </Stack>
                    </AccordionDetails>
                </Accordion>
            )}
            <Divider />
            <Box sx={{ px: 1, py: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                <TalentRowActions row={row} handlers={handlers} />
            </Box>
        </Card>
    );
}
