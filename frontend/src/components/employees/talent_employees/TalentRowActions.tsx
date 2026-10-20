// src/components/employees/talent_employees/TalentRowActions.tsx
import { Box, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import type { RosterRow } from './talentEmployeesApi';
import type { TalentRowHandlers } from './talentRowHandlers';

interface Props {
    row: RosterRow;
    handlers: TalentRowHandlers;
}

// Employee-level talent actions: open the Talent audit tab, create the audit
// (when missing), add a job assessment, add an interview.
export function TalentRowActions({ row, handlers }: Props) {
    const getString = useString();
    const hasAudit = row.talent_audit_id != null;
    return (
        <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
            <Tooltip title={cfl(getString('talentAudit'))}>
                <IconButton size="small" color="secondary" onClick={() => handlers.openAudit(row)}>
                    <AssessmentIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            {hasAudit ? (
                <>
                    <Tooltip title={cfl(getString('addTalentAuditJob'))}>
                        <IconButton size="small" color="primary" onClick={() => handlers.addJob(row)}>
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={cfl(getString('addInterview'))}>
                        {/* span: a disabled button fires no events for the Tooltip */}
                        <span>
                            <IconButton
                                size="small"
                                color="info"
                                disabled={row.talents.length === 0}
                                onClick={() => handlers.addInterview(row)}
                            >
                                <RecordVoiceOverIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </>
            ) : (
                <Tooltip title={cfl(getString('createTalentAudit'))}>
                    <IconButton size="small" color="primary" onClick={() => handlers.createAudit(row)}>
                        <AddCircleOutlineIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    );
}
