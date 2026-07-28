import type { Mission } from './missionApi';
import type { GetStringFn } from '../../types/getStringFn';
import ConfirmDeleteDialog from '../ui/ConfirmDeleteDialog';

interface Props {
    open: boolean;
    mission: Mission | null;
    getString: GetStringFn;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

/** Deleting a mission takes its KPIs, comments and competence link with it
 *  (DB-level CASCADE), so the confirmation says so explicitly. */
export function MissionDeleteDialog({
    open,
    mission,
    getString,
    onClose,
    onConfirm,
    isDeleting,
}: Props) {
    return (
        <ConfirmDeleteDialog
            open={open}
            title={getString('deleteMission')}
            message={getString('deleteMissionConfirm')}
            itemLabel={mission?.text}
            isDeleting={isDeleting}
            onConfirm={onConfirm}
            onClose={onClose}
        />
    );
}
