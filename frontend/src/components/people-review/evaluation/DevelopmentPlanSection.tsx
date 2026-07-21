import { Box } from '@mui/material';
import { MissionsPanel } from '../../missions/MissionsPanel';
import type { GetStringFn } from '../../../types/getStringFn';

interface Props {
    /** Whose plan this is. Missions belong to the EMPLOYEE, not to the review
     *  record, so this is the employee id — not the rse id. */
    employeeId: number;
    getString: GetStringFn;
}

/**
 * The people-review "Development plan" analysis tab.
 *
 * Now a thin host over the shared MissionsPanel, which the employee card's
 * `missions` tab renders too — one implementation, so the two can never drift.
 *
 * What changed and why it is not a regression: the development plan used to be
 * a JSON blob on review_session_employees, edited here through the 700 ms
 * autosave by whoever could edit the review. It is now employee-owned rows with
 * dates, per-KPI fulfilment and an audit trail, written through explicit
 * endpoints. Consequences visible here:
 *   * missions have left the autosave path entirely (see useEvaluationAutosave);
 *   * only the employee's oversight manager (or admin/dev) may edit them, so a
 *     self-reviewing employee now reads their plan and writes through mission
 *     comments and their development vision instead;
 *   * the plan no longer resets or re-links when the competence summary changes.
 */
export function DevelopmentPlanSection({ employeeId, getString }: Props) {
    return (
        <Box>
            <MissionsPanel
                employeeId={employeeId}
                getString={getString}
                density="compact"
                showVision
            />
        </Box>
    );
}
