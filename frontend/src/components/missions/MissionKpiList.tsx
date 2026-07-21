import { useState } from 'react';
import {
    Box,
    Button,
    Chip,
    IconButton,
    LinearProgress,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';
import PercentIcon from '@mui/icons-material/Percent';
import type { MissionKpi } from './missionApi';
import type { GetStringFn } from '../../types/getStringFn';

interface Props {
    kpis: MissionKpi[];
    /** Oversight manager (or admin): may add/edit/remove KPIs and set percent. */
    canManage: boolean;
    kpiMaxLength: number;
    getString: GetStringFn;
    dimmed: boolean;
    onAdd: (text: string) => void;
    onUpdateText: (kpiId: number, text: string) => void;
    onDelete: (kpiId: number) => void;
    onSetPercent: (kpi: MissionKpi) => void;
}

/**
 * The KPI rows under one mission, each with its fulfilment bar.
 *
 * The remove button is disabled on the last remaining KPI — the backend refuses
 * it anyway (a mission must keep at least one), so disabling it here turns a
 * would-be error into an obvious affordance.
 */
export function MissionKpiList({
    kpis,
    canManage,
    kpiMaxLength,
    getString,
    dimmed,
    onAdd,
    onUpdateText,
    onDelete,
    onSetPercent,
}: Props) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [draft, setDraft] = useState('');
    const [adding, setAdding] = useState(false);
    const [newText, setNewText] = useState('');

    const startEdit = (kpi: MissionKpi) => {
        setEditingId(kpi.id);
        setDraft(kpi.text);
    };
    const commitEdit = (kpiId: number) => {
        const text = draft.trim();
        if (text) onUpdateText(kpiId, text);
        setEditingId(null);
    };
    const commitAdd = () => {
        const text = newText.trim();
        if (text) onAdd(text);
        setNewText('');
        setAdding(false);
    };

    return (
        <Box sx={{ opacity: dimmed ? 0.75 : 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {getString('kpis')}
            </Typography>

            <Stack spacing={1} sx={{ mt: 0.5 }}>
                {kpis.map((kpi) => (
                    <Box key={kpi.id}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {editingId === kpi.id ? (
                                <>
                                    <TextField
                                        size="small"
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        inputProps={{ maxLength: kpiMaxLength }}
                                        fullWidth
                                        autoFocus
                                    />
                                    <Tooltip title={getString('doneEditing')}>
                                        <IconButton size="small" onClick={() => commitEdit(kpi.id)}>
                                            <DoneIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            ) : (
                                <>
                                    <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-word' }}>
                                        {kpi.text}
                                    </Typography>
                                    <Chip
                                        size="small"
                                        label={`${kpi.percent}%`}
                                        variant="outlined"
                                        color={kpi.percent >= 100 ? 'success' : 'default'}
                                    />
                                    {canManage && (
                                        <>
                                            <Tooltip title={getString('setKpiPercent')}>
                                                <IconButton size="small" onClick={() => onSetPercent(kpi)}>
                                                    <PercentIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={getString('editKpi')}>
                                                <IconButton size="small" onClick={() => startEdit(kpi)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={getString('deleteKpi')}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => onDelete(kpi.id)}
                                                        disabled={kpis.length <= 1}
                                                    >
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </>
                                    )}
                                </>
                            )}
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(100, Math.max(0, kpi.percent))}
                            sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                        />
                    </Box>
                ))}
            </Stack>

            {canManage && (
                adding ? (
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <TextField
                            size="small"
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                            placeholder={getString('missionKpiPlaceholder')}
                            inputProps={{ maxLength: kpiMaxLength }}
                            fullWidth
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitAdd();
                                }
                            }}
                        />
                        <Button
                            size="small"
                            onClick={commitAdd}
                            disabled={!newText.trim()}
                            sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                        >
                            {getString('save')}
                        </Button>
                    </Stack>
                ) : (
                    <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setAdding(true)}
                        sx={{ textTransform: 'none', mt: 0.5 }}
                    >
                        {getString('addKpi')}
                    </Button>
                )
            )}
        </Box>
    );
}
