import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import type { Mission } from './missionApi';
import type { GetStringFn } from '../../types/getStringFn';

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
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('deleteMission')}</DialogTitle>
            <DialogContent>
                <DialogContentText>{getString('deleteMissionConfirm')}</DialogContentText>
                {mission && (
                    <DialogContentText sx={{ mt: 1, fontWeight: 600 }}>
                        {mission.text}
                    </DialogContentText>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    {getString('cancel')}
                </Button>
                <Button
                    color="error"
                    variant="contained"
                    onClick={onConfirm}
                    disabled={isDeleting}
                    sx={{ textTransform: 'none' }}
                >
                    {getString('delete')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
