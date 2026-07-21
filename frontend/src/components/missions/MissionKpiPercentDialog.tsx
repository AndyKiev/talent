import { useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Slider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import type { MissionKpi } from './missionApi';
import type { GetStringFn } from '../../types/getStringFn';

interface Props {
    /** Non-null by construction: the parent renders this component only while a
     *  KPI is selected, so it MOUNTS FRESH per KPI and seeds its state from the
     *  prop. That is the project's dialog convention — syncing state from props
     *  in an effect causes cascading renders and is lint-blocked. */
    kpi: MissionKpi;
    getString: GetStringFn;
    onClose: () => void;
    onSave: (percent: number) => void;
    isSaving: boolean;
}

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/**
 * Set a KPI's fulfilment percentage.
 *
 * Only rendered when `canManage` is true (oversight manager or admin) — a
 * fulfilment figure is an assessment OF the employee, so it is never self-serve.
 * The backend re-checks the same rule and the 0..100 bound, and records the
 * old→new pair in the change trail.
 */
export function MissionKpiPercentDialog({ kpi, getString, onClose, onSave, isSaving }: Props) {
    const [percent, setPercent] = useState(() => kpi.percent);

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('setKpiPercent')}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {kpi.text}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ flex: 1 }}>
                        <Slider
                            value={percent}
                            onChange={(_, v) => setPercent(clamp(v as number))}
                            min={0}
                            max={100}
                            step={5}
                            marks={[
                                { value: 0, label: '0' },
                                { value: 50, label: '50' },
                                { value: 100, label: '100' },
                            ]}
                            valueLabelDisplay="auto"
                        />
                    </Box>
                    <TextField
                        size="small"
                        type="number"
                        label={getString('kpiPercent')}
                        value={percent}
                        onChange={(e) => setPercent(clamp(Number(e.target.value)))}
                        inputProps={{ min: 0, max: 100 }}
                        sx={{ width: 110 }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    {getString('cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={() => onSave(percent)}
                    disabled={isSaving}
                    sx={{ textTransform: 'none' }}
                >
                    {getString('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
