// src/components/employees/trainings/TrainingsPage.tsx
//
// The employee card's Trainings tab. Two independent blocks:
//
//   * assigned trainings    — the training MODULE (training_types + eligibility),
//                             rendered only while `training_module_enabled` is on;
//   * recommended trainings — employee-scoped free-text development advice,
//                             ALWAYS rendered. Same panel the people review
//                             shows, reading the same rows.
//
// That is why the tab itself is no longer gated on the module (see
// EmployeeCardLayout): switching the module off must not hide the advice.
import { useParams } from '@tanstack/react-router';
import { Box, Paper } from '@mui/material';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import { useBooleanSetting } from '../../../hooks/useAppSetting';
import { EmployeeTrainingsPanel } from './EmployeeTrainingsPanel';
import { RecommendedTrainingsPanel } from './RecommendedTrainingsPanel';

export function TrainingsPage() {
    const { employeeId: employeeIdStr } = useParams({
        from: '/employees/$employeeId/trainings/',
    });
    const employeeId = Number(employeeIdStr);
    const getString = useString({ str });
    const { enabled: trainingModuleOn } = useBooleanSetting('training_module_enabled');

    return (
        <Box>
            {trainingModuleOn && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <EmployeeTrainingsPanel
                        employeeId={employeeId}
                        isEditable
                        getString={getString}
                    />
                </Paper>
            )}
            <Paper variant="outlined" sx={{ p: 2 }}>
                <RecommendedTrainingsPanel employeeId={employeeId} isEditable />
            </Paper>
        </Box>
    );
}
