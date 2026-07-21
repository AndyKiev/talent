import { useParams } from '@tanstack/react-router';
import { Paper } from '@mui/material';
import useString from '../../hooks/useString';
import { MissionsPanel } from '../missions/MissionsPanel';

/**
 * The employee card's `missions` tab.
 *
 * A thin host: all behaviour lives in MissionsPanel, which the people-review
 * analysis tab renders too, so the two views can never drift apart.
 */
export function EmployeeMissionsTab() {
    const { employeeId } = useParams({ from: '/employees/$employeeId' });
    const getString = useString();

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <MissionsPanel
                employeeId={Number(employeeId)}
                getString={getString}
                density="full"
                showVision
            />
        </Paper>
    );
}
