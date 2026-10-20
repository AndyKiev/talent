// src/components/employees/talent_employees/TalentLineActions.tsx
import { Box, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import type { RosterRow, RosterTalent } from './talentEmployeesApi';
import type { TalentRowHandlers } from './talentRowHandlers';

interface Props {
    row: RosterRow;
    talent: RosterTalent;
    handlers: TalentRowHandlers;
}

// Per-talent actions, same rule as the Talent audit tab: change the job
// status; delete the job assessment, or — once interviewed — the interview.
export function TalentLineActions({ row, talent, handlers }: Props) {
    const getString = useString();
    return (
        <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
            <Tooltip title={cfl(getString('changeJobStatus'))}>
                <IconButton size="small" onClick={() => handlers.changeStatus(row, talent)}>
                    <EditIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip
                title={cfl(getString(talent.interview_id ? 'deleteInterview' : 'deleteJobAssessment'))}
            >
                <IconButton size="small" color="error" onClick={() => handlers.deleteTalent(row, talent)}>
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    );
}
