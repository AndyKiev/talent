import { useState } from 'react';
import {
    Box,
    Button,
    Chip,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';
import type { GetStringFn } from '../../../types/getStringFn';
import type { Mission } from './evaluationHelpers';
import { useTheme } from '../../theme/ThemeContext';

/** A competence option offered for linking a mission, with its display color. */
export interface CompetenceOption {
    key: string;
    name: string;
    color: string;
}

/** Dropdown to link a mission to a competence (its name shown in its own color). */
function MissionCompetenceSelect({
    value, onChange, options, competenceFor, getString, mutedColor,
}: {
    value: string | null;
    onChange: (key: string | null) => void;
    options: CompetenceOption[];
    competenceFor: (key: string | null) => CompetenceOption | undefined;
    getString: GetStringFn;
    mutedColor: string;
}) {
    return (
        <FormControl size="small" variant="outlined" sx={{ minWidth: 190, maxWidth: 210, flex: 'none' }}>
            <InputLabel shrink>{getString('missionForCompetence')}</InputLabel>
            <Select
                variant="outlined"
                label={getString('missionForCompetence')}
                notched
                value={value ?? ''}
                onChange={e => onChange(e.target.value ? String(e.target.value) : null)}
                renderValue={(val) => {
                    const o = competenceFor(val ? String(val) : null);
                    return o
                        ? <span style={{ color: o.color, fontWeight: 600 }}>{o.name}</span>
                        : <span style={{ color: mutedColor }}>{getString('missionNoCompetence')}</span>;
                }}
                displayEmpty
            >
                <MenuItem value=""><em>{getString('missionNoCompetence')}</em></MenuItem>
                {options.map(o => (
                    <MenuItem key={o.key} value={o.key} sx={{ color: o.color, fontWeight: 600 }}>{o.name}</MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}

interface Props {
    isEditable: boolean;
    getString: GetStringFn;
    // Development plan — a numbered add/remove list of missions, each optionally
    // linked to a competence-to-develop (count bounded by min/max).
    missions: Mission[];
    onUpdateMission: (index: number, value: string) => void;
    onUpdateMissionKpi: (index: number, value: string) => void;
    onAddMission: (text: string, dimensionKey: string | null) => void;
    onRemoveMission: (index: number) => void;
    onSetMissionCompetence: (index: number, dimensionKey: string | null) => void;
    newMissionText: string;
    onNewMissionTextChange: (value: string) => void;
    newMissionKpi: string;
    onNewMissionKpiChange: (value: string) => void;
    newMissionCompetence: string | null;
    onNewMissionCompetenceChange: (dimensionKey: string | null) => void;
    minMissions: number;
    maxMissions: number;
    /** Max characters for the KPI field (defaults to 126). */
    kpiMaxLength?: number;
    developCompetenceOptions: CompetenceOption[];
    allCompetenceOptions: CompetenceOption[];
    allowFullCompetenceList: boolean;
}

/**
 * Standalone development-plan (IDP) card — a numbered add/remove list of missions,
 * each optionally linked to a competence-to-develop. Lives below the competence
 * summary (it builds on which competences were picked to develop).
 */
export function DevelopmentPlanSection({
    isEditable, getString,
    missions, onUpdateMission, onUpdateMissionKpi, onAddMission, onRemoveMission, onSetMissionCompetence,
    newMissionText, onNewMissionTextChange, newMissionKpi, onNewMissionKpiChange,
    newMissionCompetence, onNewMissionCompetenceChange,
    minMissions, maxMissions, kpiMaxLength = 126,
    developCompetenceOptions, allCompetenceOptions, allowFullCompetenceList,
}: Props) {
    const { t } = useTheme();
    // On-demand edit (inputs revealed) — same pattern as the other sections.
    const [editing, setEditing] = useState(false);
    // When the developer setting allows it, switch the competence picker from the
    // "to develop" shortlist to the full competence list.
    const [useFullCompetenceList, setUseFullCompetenceList] = useState(false);
    // Missions are edited one at a time (per-row pencil).
    const [editMissionIdx, setEditMissionIdx] = useState<number | null>(null);

    const planEditing = isEditable && editing;
    const showFull = allowFullCompetenceList && useFullCompetenceList;
    const pickerOptions = showFull ? allCompetenceOptions : developCompetenceOptions;
    // Lookup uses the full list so an already-linked competence still resolves its
    // name+color even when off the shortlist.
    const competenceFor = (key: string | null) =>
        key ? allCompetenceOptions.find(o => o.key === key) : undefined;
    const canAdd = missions.length < maxMissions;
    const canRemove = planEditing && missions.length > minMissions;
    const kpiMax = kpiMaxLength;

    return (
        <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography fontSize={13} fontWeight={700} color={t.textSecondary} textTransform="uppercase" letterSpacing="0.3px">
                        {getString('developmentPlan')}
                    </Typography>
                    {isEditable && (
                        <Tooltip title={getString(editing ? 'doneEditing' : 'edit')}>
                            <IconButton size="small" onClick={() => setEditing(v => !v)} sx={{ p: 0.25 }}>
                                {editing ? <DoneIcon sx={{ fontSize: 16 }} /> : <EditIcon sx={{ fontSize: 15 }} />}
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>

                {planEditing && (
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={2}
                        sx={{ mb: 1, flexWrap: 'wrap' }}
                    >
                        <Typography fontSize={12} color={t.textMuted} sx={{ whiteSpace: 'nowrap' }}>
                            {getString('missionCountHint', { min: String(minMissions), max: String(maxMissions) })}
                        </Typography>
                        {allowFullCompetenceList && (
                            <FormControlLabel
                                sx={{ m: 0 }}
                                control={
                                    <Switch
                                        size="small"
                                        checked={useFullCompetenceList}
                                        onChange={e => setUseFullCompetenceList(e.target.checked)}
                                    />
                                }
                                label={
                                    <Typography fontSize={12}>{getString('missionShowAllCompetences')}</Typography>
                                }
                            />
                        )}
                    </Stack>
                )}

                {(missions.length > 0 || !isEditable) && (
                    <Box sx={{ mb: 1.5 }}>
                        {missions.map((mission, idx) => {
                            const comp = competenceFor(mission.dimension_key);
                            const rowEditing = planEditing && editMissionIdx === idx;
                            return (
                            <Stack
                                key={`mission-${idx}`}
                                direction="row"
                                alignItems="flex-start"
                                spacing={1}
                                sx={{ mb: 1, py: 0.5, px: 0.75, borderRadius: '6px', '&:hover': { bgcolor: t.accent + '10' } }}
                            >
                                <Typography fontSize={12} fontWeight={700} color={t.accent} sx={{ minWidth: 22, pt: '8px' }}>
                                    {idx + 1}.
                                </Typography>
                                {rowEditing ? (
                                    // Text input (task) on top, then KPI + competence on the same row.
                                    <Stack direction="column" spacing={0.75} sx={{ flex: 1 }}>
                                        <TextField
                                            size="small"
                                            label={getString('missionTask')}
                                            value={mission.text}
                                            onChange={e => onUpdateMission(idx, e.target.value)}
                                            placeholder={getString('typeMissionPlaceholder')}
                                            multiline minRows={2} maxRows={4}
                                            fullWidth
                                        />
                                        <Stack direction="row" spacing={1} alignItems="flex-start">
                                            <TextField
                                                size="small"
                                                label={getString('missionKpi')}
                                                value={mission.kpi ?? ''}
                                                onChange={e => onUpdateMissionKpi(idx, e.target.value.slice(0, kpiMax))}
                                                placeholder={getString('missionKpiPlaceholder')}
                                                inputProps={{ maxLength: kpiMax }}
                                                sx={{ flex: 1 }}
                                            />
                                            <MissionCompetenceSelect
                                                value={mission.dimension_key}
                                                onChange={k => onSetMissionCompetence(idx, k)}
                                                options={pickerOptions}
                                                competenceFor={competenceFor}
                                                getString={getString}
                                                mutedColor={t.textMuted}
                                            />
                                        </Stack>
                                    </Stack>
                                ) : (
                                    <Stack direction="column" spacing={0.25} sx={{ flex: 1, pt: '4px' }}>
                                        <Stack direction="row" spacing={1} alignItems="flex-start">
                                            <Typography fontSize={13} sx={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: mission.text ? t.text : t.textMuted }}>
                                                {mission.text || '—'}
                                            </Typography>
                                            {comp && (
                                                <Chip
                                                    size="small"
                                                    label={comp.name}
                                                    sx={{
                                                        color: comp.color,
                                                        borderColor: comp.color,
                                                        fontWeight: 600,
                                                        bgcolor: comp.color + '14',
                                                        flex: 'none',
                                                    }}
                                                    variant="outlined"
                                                />
                                            )}
                                        </Stack>
                                        {mission.kpi ? (
                                            <Typography fontSize={11} color={t.textMuted} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                <Box component="span" sx={{ fontWeight: 600, color: t.textSecondary }}>
                                                    {getString('missionKpi')}:
                                                </Box>{' '}
                                                {mission.kpi}
                                            </Typography>
                                        ) : (
                                            <Typography fontSize={11} color={t.textMuted}>
                                                {getString('missionKpi')}: —
                                            </Typography>
                                        )}
                                    </Stack>
                                )}
                                {planEditing && (
                                    <Tooltip title={getString(rowEditing ? 'doneEditing' : 'edit')}>
                                        <IconButton
                                            size="small"
                                            onClick={() => setEditMissionIdx(rowEditing ? null : idx)}
                                            sx={{ p: 0.25, mt: '4px' }}
                                        >
                                            {rowEditing ? <DoneIcon sx={{ fontSize: 16 }} /> : <EditIcon sx={{ fontSize: 15 }} />}
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {rowEditing && (
                                    <Tooltip title={getString('deleteFact')}>
                                        <span>
                                            <IconButton
                                                size="small"
                                                onClick={() => { onRemoveMission(idx); setEditMissionIdx(null); }}
                                                disabled={!canRemove}
                                                sx={{ p: 0.25, mt: '4px' }}
                                            >
                                                <CloseIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                )}
                            </Stack>
                            );
                        })}
                        {missions.length === 0 && !isEditable && (
                            <Typography fontSize={13} color={t.textMuted}>—</Typography>
                        )}
                    </Box>
                )}

                {/* Add row: only visible in edit mode, within the max bound.
                    Task on top row, then KPI + competence + Add button on the bottom row. */}
                {planEditing && canAdd && (
                    <Stack direction="column" spacing={0.75}>
                        <TextField
                            size="small"
                            label={getString('missionTask')}
                            placeholder={getString('typeMissionPlaceholder')}
                            value={newMissionText}
                            onChange={e => onNewMissionTextChange(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (newMissionKpi.trim()) {
                                        onAddMission(newMissionText, newMissionCompetence);
                                    }
                                }
                            }}
                            multiline minRows={2} maxRows={4}
                            fullWidth
                        />
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                            <TextField
                                size="small"
                                label={getString('missionKpi')}
                                placeholder={getString('missionKpiPlaceholder')}
                                value={newMissionKpi}
                                onChange={e => onNewMissionKpiChange(e.target.value.slice(0, kpiMax))}
                                inputProps={{ maxLength: kpiMax }}
                                sx={{ flex: 1 }}
                            />
                            <MissionCompetenceSelect
                                value={newMissionCompetence}
                                onChange={onNewMissionCompetenceChange}
                                options={pickerOptions}
                                competenceFor={competenceFor}
                                getString={getString}
                                mutedColor={t.textMuted}
                            />
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => onAddMission(newMissionText, newMissionCompetence)}
                                disabled={!newMissionText.trim() || !newMissionKpi.trim()}
                                sx={{ textTransform: 'none', whiteSpace: 'nowrap', mt: '2px' }}
                            >
                                {getString('addMission')}
                            </Button>
                        </Stack>
                    </Stack>
                )}
        </Box>
    );
}
