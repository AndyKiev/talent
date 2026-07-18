import { type Dispatch, type SetStateAction } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
import type { GetStringFn } from '../../../types/getStringFn';
import { useTheme } from '../../theme/ThemeContext';
import type { PendingMove, PendingFlip, CompetenceSide } from './evaluationHelpers';
import {
    competenceSideLabelKey,
    competenceSideFlipKey,
    dragItemTitleKey,
    dragItemConfirmKey,
    DragItemKind,
} from './evaluationHelpers';

interface Props {
    getString: GetStringFn;
    // Move a fact / improvement to another competence tab.
    pendingMove: PendingMove | null;
    setPendingMove: Dispatch<SetStateAction<PendingMove | null>>;
    moveFact: (fromEvalId: number, index: number, toEvalId: number) => void;
    moveImprovement: (fromEvalId: number, index: number, toEvalId: number) => void;
    setActiveTab: Dispatch<SetStateAction<number>>;
    // Star re-rating flip.
    pendingFlip: PendingFlip | null;
    setPendingFlip: Dispatch<SetStateAction<PendingFlip | null>>;
    confirmFlip: () => void;
    // Direct removal of a mission-linked to-develop competence.
    pendingDevelopRemoval: { key: string; name: string } | null;
    setPendingDevelopRemoval: Dispatch<SetStateAction<{ key: string; name: string } | null>>;
    confirmDevelopRemoval: () => void;
    // Leaving full-list mode with misplaced picks.
    pendingSummaryReconcile: { key: string; name: string; side: CompetenceSide }[] | null;
    setPendingSummaryReconcile: Dispatch<SetStateAction<{ key: string; name: string; side: CompetenceSide }[] | null>>;
    confirmSummaryReconcile: () => void;
}

/**
 * The four confirmation dialogs of the evaluation page: move fact/improvement,
 * flip a competence's summary list, remove a mission-linked to-develop competence,
 * and reconcile the summary when leaving full-list mode. Pure presentation over the
 * pending-state + confirm callbacks owned by the page/hooks.
 */
export function EvaluationConfirmDialogs({
    getString,
    pendingMove, setPendingMove, moveFact, moveImprovement, setActiveTab,
    pendingFlip, setPendingFlip, confirmFlip,
    pendingDevelopRemoval, setPendingDevelopRemoval, confirmDevelopRemoval,
    pendingSummaryReconcile, setPendingSummaryReconcile, confirmSummaryReconcile,
}: Props) {
    const { t } = useTheme();

    return (
        <>
            {/* Confirm moving a fact / direction-for-improvement to another competence tab */}
            <Dialog open={pendingMove != null} onClose={() => setPendingMove(null)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    {pendingMove && getString(dragItemTitleKey(pendingMove.kind))}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 1 }}>
                        {pendingMove && getString(dragItemConfirmKey(pendingMove.kind), { target: pendingMove.toName })}
                    </DialogContentText>
                    {pendingMove && (
                        <Typography fontSize={13} sx={{ fontStyle: 'italic', color: t.textMuted, wordBreak: 'break-word' }}>
                            “{pendingMove.text}”
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingMove(null)} sx={{ textTransform: 'none' }}>
                        {getString('cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            if (pendingMove) {
                                if (pendingMove.kind === DragItemKind.Improvement) {
                                    moveImprovement(pendingMove.fromEvalId, pendingMove.index, pendingMove.toEvalId);
                                } else {
                                    moveFact(pendingMove.fromEvalId, pendingMove.index, pendingMove.toEvalId);
                                }
                                setActiveTab(pendingMove.toTabIndex);
                            }
                            setPendingMove(null);
                        }}
                        sx={{ textTransform: 'none' }}
                    >
                        {getString('move')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm a star re-rating that flips a competence to the opposite summary
                list — it deletes the competence from its current list along with the
                facts/comments linked to it there. Applied atomically. */}
            <Dialog open={pendingFlip != null} onClose={() => setPendingFlip(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('flipCompetenceTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {pendingFlip && getString(competenceSideFlipKey(pendingFlip.side), { competence: pendingFlip.name })}
                    </DialogContentText>
                    {pendingFlip?.missionLinked && (
                        <DialogContentText sx={{ mt: 1.5, color: 'warning.main' }}>
                            {getString('flipCompetenceMissionWarning', { competence: pendingFlip?.name ?? '' })}
                        </DialogContentText>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingFlip(null)} sx={{ textTransform: 'none' }}>
                        {getString('cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => { void confirmFlip(); }}
                        sx={{ textTransform: 'none' }}
                    >
                        {getString('flipCompetenceConfirm')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm a direct removal of a to-develop competence that is linked to a
                mission — the link is dropped on confirm (allow-full off only). */}
            <Dialog open={pendingDevelopRemoval != null} onClose={() => setPendingDevelopRemoval(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('removeDevelopCompetenceTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {getString('flipCompetenceMissionWarning', { competence: pendingDevelopRemoval?.name ?? '' })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingDevelopRemoval(null)} sx={{ textTransform: 'none' }}>
                        {getString('cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmDevelopRemoval}
                        sx={{ textTransform: 'none' }}
                    >
                        {getString('delete')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm leaving full-list mode when some picked competences no longer fit
                their side by the current scores — they are removed (facts/improvements
                cleared) and only then is the switch turned off. */}
            <Dialog open={pendingSummaryReconcile != null} onClose={() => setPendingSummaryReconcile(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('reconcileSummaryTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 1 }}>{getString('reconcileSummaryBody')}</DialogContentText>
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                        {pendingSummaryReconcile?.map((m) => (
                            <Typography key={`${m.side}-${m.key}`} fontSize={13} fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                                • {m.name} — {getString(competenceSideLabelKey(m.side))}
                            </Typography>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingSummaryReconcile(null)} sx={{ textTransform: 'none' }}>
                        {getString('cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmSummaryReconcile}
                        sx={{ textTransform: 'none' }}
                    >
                        {getString('reconcileSummaryConfirm')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
