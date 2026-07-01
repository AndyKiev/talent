// src/components/employees/trainings/TrainingsPage.tsx
import { useParams } from '@tanstack/react-router';
import { Box, Paper } from '@mui/material';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import { EmployeeTrainingsPanel } from './EmployeeTrainingsPanel';

export function TrainingsPage() {
    const { employeeId: employeeIdStr } = useParams({
        from: '/employees/$employeeId/trainings/',
    });
    const employeeId = Number(employeeIdStr);
    const getString = useString({ str });

    return (
        <Box>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <EmployeeTrainingsPanel employeeId={employeeId} isEditable getString={getString} />
            </Paper>
        </Box>
    );
}
