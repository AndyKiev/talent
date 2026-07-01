// src/components/training/state/TrainingStateStatsDialog.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Autocomplete,
    TextField,
    CircularProgress,
    Alert,
} from '@mui/material';
import type { TrainingType } from '../training_types/trainingTypeApi.ts';
import { fetchTrainingState } from './trainingStateApi.ts';
import { fetchEmployeeTrainingStatuses } from '../employee_training_statuses/employeeTrainingStatusApi.ts';
import { buildStatusOrder, trainingStatusLabel, statusColor } from './trainingStatusMeta.ts';
import { TRAINING_STATE_QK, EMPLOYEE_TRAINING_STATUS_QK } from '../../../utils/queryKeys.ts';
import useString from '../../../hooks/useString.ts';
import cfl from '../../../utils/helpers.ts';

interface DeptStat {
    key: string; // department id as string, or '__none__'
    name: string;
    counts: Record<string, number>;
    total: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    trainingTypes: TrainingType[];
    initialTrainingTypeId: number | null;
}

export function TrainingStateStatsDialog({ open, onClose, trainingTypes, initialTrainingTypeId }: Props) {
    const getString = useString();
    const [typeId, setTypeId] = useState<number | null>(initialTrainingTypeId);
    const [lastInitial, setLastInitial] = useState<number | null>(initialTrainingTypeId);

    // Adopt the page's selected type each time the dialog is (re)opened.
    if (open && initialTrainingTypeId !== lastInitial) {
        setLastInitial(initialTrainingTypeId);
        setTypeId(initialTrainingTypeId);
    }

    const selectedType = trainingTypes.find((t) => t.id === typeId) ?? null;

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: TRAINING_STATE_QK(typeId),
        queryFn: () => fetchTrainingState(typeId as number),
        enabled: open && typeId != null,
        staleTime: 60 * 1000,
    });

    const { data: statuses = [] } = useQuery({
        queryKey: EMPLOYEE_TRAINING_STATUS_QK,
        queryFn: fetchEmployeeTrainingStatuses,
        enabled: open,
        staleTime: 5 * 60 * 1000,
    });

    // DB-driven order: not_planned first, then statuses by sort_order.
    const orderedStatusKeys = useMemo(() => buildStatusOrder(statuses), [statuses]);

    const stats = useMemo<DeptStat[]>(() => {
        const map = new Map<string, DeptStat>();
        for (const r of rows) {
            const key = r.main_department_id != null ? String(r.main_department_id) : '__none__';
            let stat = map.get(key);
            if (!stat) {
                stat = {
                    key,
                    name: r.main_department_name || (getString('noDepartment') || '—'),
                    counts: Object.fromEntries(orderedStatusKeys.map((k) => [k, 0])),
                    total: 0,
                };
                map.set(key, stat);
            }
            stat.counts[r.status_key] = (stat.counts[r.status_key] ?? 0) + 1;
            stat.total += 1;
        }
        return [...map.values()].sort((a, b) => b.total - a.total);
    }, [rows, getString, orderedStatusKeys]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{cfl(getString('trainingStatistics')) || 'Statistics by department'}</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ mb: 2 }}>
                    <Autocomplete
                        size="small"
                        options={trainingTypes}
                        getOptionLabel={(o) => o.name}
                        value={selectedType}
                        onChange={(_e, v) => setTypeId(v?.id ?? null)}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                        noOptionsText={getString('noOptions') || 'No options'}
                        renderInput={(params) => (
                            <TextField {...params} variant="outlined" label={cfl(getString('trainingType')) || 'Training type'} />
                        )}
                    />
                </Box>

                {/* Legend */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                    {orderedStatusKeys.map((k) => (
                        <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: statusColor(k) }} />
                            <Typography variant="caption">{trainingStatusLabel(getString, k)}</Typography>
                        </Box>
                    ))}
                </Box>

                {typeId == null && (
                    <Typography color="text.secondary">
                        {getString('selectTrainingTypePrompt') || 'Select a training type.'}
                    </Typography>
                )}
                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                )}
                {error && <Alert severity="error">{(error as Error).message}</Alert>}
                {typeId != null && !isLoading && !error && stats.length === 0 && (
                    <Typography color="text.secondary">{getString('noData') || 'No data.'}</Typography>
                )}

                {/* Scrollable list of stacked horizontal bars, one per main department */}
                <Box sx={{ maxHeight: 440, overflowY: 'auto', pr: 1 }}>
                    {stats.map((s) => (
                        <Box key={s.key} sx={{ mb: 2.5 }}>
                            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                                {s.name} ({s.total})
                            </Typography>
                            {/* counts row — each number sits above its own segment.
                                flexBasis:0 + minWidth:0 makes width purely proportional
                                (text would otherwise force flex-basis:auto and drift). */}
                            <Box sx={{ display: 'flex', height: 18, mb: 0.25 }}>
                                {orderedStatusKeys.map((k) =>
                                    s.counts[k] > 0 ? (
                                        <Box
                                            key={k}
                                            sx={{
                                                flexGrow: s.counts[k],
                                                flexBasis: 0,
                                                minWidth: 0,
                                                textAlign: 'center',
                                                fontSize: 12,
                                                lineHeight: '18px',
                                                whiteSpace: 'nowrap',
                                                overflow: 'visible',
                                            }}
                                        >
                                            {s.counts[k]}
                                        </Box>
                                    ) : null,
                                )}
                            </Box>
                            {/* bar row — same flexGrow + flexBasis:0 so segments line up
                                exactly under the numbers above. */}
                            <Box sx={{ display: 'flex', height: 24, borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>
                                {orderedStatusKeys.map((k) =>
                                    s.counts[k] > 0 ? (
                                        <Box
                                            key={k}
                                            title={`${trainingStatusLabel(getString, k)}: ${s.counts[k]}`}
                                            sx={{ flexGrow: s.counts[k], flexBasis: 0, minWidth: 0, bgcolor: statusColor(k) }}
                                        />
                                    ) : null,
                                )}
                            </Box>
                        </Box>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onClose}>
                    {getString('close') || 'Close'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
