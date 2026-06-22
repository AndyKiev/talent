import { useState, type ReactNode } from 'react';
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
    Tab,
    Tabs,
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

/** Title row with an on-demand edit / done pencil (shown only when editable). */
function SectionHeader({
    title, editable, editing, onToggle, getString,
}: {
    title: string;
    editable: boolean;
    editing: boolean;
    onToggle: () => void;
    getString: GetStringFn;
}) {
    const { t } = useTheme();
    return (
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography fontSize={13} fontWeight={600} color={t.textSecondary}>{title}</Typography>
            {editable && (
                <Tooltip title={getString(editing ? 'doneEditing' : 'edit')}>
                    <IconButton size="small" onClick={onToggle} sx={{ p: 0.25 }}>
                        {editing ? <DoneIcon sx={{ fontSize: 16 }} /> : <EditIcon sx={{ fontSize: 15 }} />}
                    </IconButton>
                </Tooltip>
            )}
        </Stack>
    );
}

/** A single free-text section: read-only text by default, textarea once editing. */
function TextSection({
    title, value, onChange, editable, editing, onToggle, getString,
}: {
    title: string;
    value: string;
    onChange: (value: string) => void;
    editable: boolean;
    editing: boolean;
    onToggle: () => void;
    getString: GetStringFn;
}) {
    const { t } = useTheme();
    return (
        <Box>
            <SectionHeader title={title} editable={editable} editing={editing} onToggle={onToggle} getString={getString} />
            {editable && editing ? (
                <TextField value={value} onChange={e => onChange(e.target.value)} fullWidth multiline minRows={5} />
            ) : (
                <Typography fontSize={13} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: value ? t.text : t.textMuted }}>
                    {value || '—'}
                </Typography>
            )}
        </Box>
    );
}

interface Props {
    dataTab: number;
    onDataTabChange: (value: number) => void;
    isEditable: boolean;
    getString: GetStringFn;
    // Personal-info / job-info tab content (built by the page; the data lives there).
    personalInfo: ReactNode;
    jobInfo: ReactNode;
    // Feedback (per-field editability: employee edits own self-feedback, reviewer
    // edits manager-feedback; both off in supervision/view-only).
    employeeFeedback: string;
    onEmployeeFeedbackChange: (value: string) => void;
    employeeFeedbackEditable: boolean;
    managerFeedback: string;
    onManagerFeedbackChange: (value: string) => void;
    managerFeedbackEditable: boolean;
    // Results
    results: string[];
    newResultText: string;
    onNewResultTextChange: (value: string) => void;
    onAddResult: (text: string) => void;
    onRemoveResult: (index: number) => void;
    // Development plan — a numbered add/remove list of missions, each optionally
    // linked to a competence-to-develop (count bounded by min/max).
    missions: Mission[];
    onUpdateMission: (index: number, value: string) => void;
    onAddMission: (text: string, dimensionKey: string | null) => void;
    onRemoveMission: (index: number) => void;
    onSetMissionCompetence: (index: number, dimensionKey: string | null) => void;
    newMissionText: string;
    onNewMissionTextChange: (value: string) => void;
    newMissionCompetence: string | null;
    onNewMissionCompetenceChange: (dimensionKey: string | null) => void;
    minMissions: number;
    maxMissions: number;
    developCompetenceOptions: CompetenceOption[];
    allCompetenceOptions: CompetenceOption[];
    allowFullCompetenceList: boolean;
    // Trainings
    trainings: string;
    onTrainingsChange: (value: string) => void;
}

/** The personal-info / job-info / feedback / results / development-plan / trainings tab strip. */
export function EmployeeDataTabs({
    dataTab, onDataTabChange, isEditable, getString,
    personalInfo, jobInfo,
    employeeFeedback, onEmployeeFeedbackChange, employeeFeedbackEditable,
    managerFeedback, onManagerFeedbackChange, managerFeedbackEditable,
    results, newResultText, onNewResultTextChange, onAddResult, onRemoveResult,
    missions, onUpdateMission, onAddMission, onRemoveMission, onSetMissionCompetence,
    newMissionText, onNewMissionTextChange, newMissionCompetence, onNewMissionCompetenceChange,
    minMissions, maxMissions,
    developCompetenceOptions, allCompetenceOptions, allowFullCompetenceList,
    trainings, onTrainingsChange,
}: Props) {
    const { t } = useTheme();
    // Which sections are currently in edit mode (inputs revealed). Read-only by
    // default — same on-demand pattern as the competence summary / dimension lists.
    const [editSections, setEditSections] = useState<Record<string, boolean>>({});
    const toggle = (key: string) => setEditSections(p => ({ ...p, [key]: !p[key] }));
    // When the developer setting allows it, the user can switch the competence
    // picker from the "to develop" shortlist to the full competence list.
    const [useFullCompetenceList, setUseFullCompetenceList] = useState(false);
    // Missions are edited one at a time (per-row pencil), not via a section toggle.
    const [editMissionIdx, setEditMissionIdx] = useState<number | null>(null);

    return (
        <Box sx={{ mb: 3, border: `1px solid ${t.borderLight}`, borderRadius: '12px', overflow: 'hidden', background: t.cardBg }}>
            <Tabs
                value={dataTab}
                onChange={(_, v) => onDataTabChange(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: `1px solid ${t.borderLight}` }}
            >
                <Tab label={getString('personalInfo')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                <Tab label={getString('jobInfo')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                <Tab label={getString('employeeFeedback')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                <Tab label={getString('managerFeedback')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                <Tab label={getString('resultsAchievements')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                <Tab label={getString('developmentPlan')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                <Tab label={getString('requiredTrainings')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
            </Tabs>

            <Box sx={{ p: 3 }}>
                {dataTab === 0 && personalInfo}

                {dataTab === 1 && jobInfo}

                {dataTab === 2 && (
                    <TextSection
                        title={getString('employeeFeedback')}
                        value={employeeFeedback}
                        onChange={onEmployeeFeedbackChange}
                        editable={employeeFeedbackEditable}
                        editing={!!editSections.employeeFeedback}
                        onToggle={() => toggle('employeeFeedback')}
                        getString={getString}
                    />
                )}

                {dataTab === 3 && (
                    <TextSection
                        title={getString('managerFeedback')}
                        value={managerFeedback}
                        onChange={onManagerFeedbackChange}
                        editable={managerFeedbackEditable}
                        editing={!!editSections.managerFeedback}
                        onToggle={() => toggle('managerFeedback')}
                        getString={getString}
                    />
                )}

                {dataTab === 4 && (() => {
                    const editing = isEditable && !!editSections.results;
                    return (
                    <Box>
                        <SectionHeader
                            title={getString('resultsAchievements')}
                            editable={isEditable}
                            editing={!!editSections.results}
                            onToggle={() => toggle('results')}
                            getString={getString}
                        />
                        {results.length > 0 ? (
                            <Box sx={{ mb: 1.5 }}>
                                {results.map((item, idx) => (
                                    <Stack
                                        key={`result-${idx}`}
                                        direction="row"
                                        alignItems="flex-start"
                                        spacing={0.5}
                                        sx={{ mb: 0.5, py: 0.5, px: 0.75, borderRadius: '6px', '&:hover': { bgcolor: t.accent + '10' } }}
                                    >
                                        <Typography fontSize={12} fontWeight={700} color={t.accent} sx={{ minWidth: 22, pt: '2px' }}>
                                            {idx + 1}.
                                        </Typography>
                                        <Typography fontSize={13} sx={{ flex: 1, pt: '2px', wordBreak: 'break-word' }}>
                                            {item}
                                        </Typography>
                                        {editing && (
                                            <Tooltip title={getString('deleteFact')}>
                                                <IconButton size="small" onClick={() => onRemoveResult(idx)} sx={{ p: 0.25, mt: '-2px' }}>
                                                    <CloseIcon sx={{ fontSize: 14 }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                ))}
                            </Box>
                        ) : (!editing && (
                            <Typography fontSize={13} color={t.textMuted}>—</Typography>
                        ))}
                        {editing && (
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    size="small"
                                    placeholder={getString('typeFactPlaceholder')}
                                    value={newResultText}
                                    onChange={e => onNewResultTextChange(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            onAddResult(newResultText);
                                        }
                                    }}
                                    fullWidth
                                />
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => onAddResult(newResultText)}
                                    disabled={!newResultText.trim()}
                                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                                >
                                    {getString('addFact')}
                                </Button>
                            </Stack>
                        )}
                    </Box>
                    );
                })()}

                {dataTab === 5 && (() => {
                    // Competence picker source: the "to develop" shortlist by default,
                    // or the full list when the developer setting allows it and the
                    // user opted in. Lookup uses the full list so an already-linked
                    // competence still resolves its name+color when off the shortlist.
                    const showFull = allowFullCompetenceList && useFullCompetenceList;
                    const pickerOptions = showFull ? allCompetenceOptions : developCompetenceOptions;
                    const competenceFor = (key: string | null) =>
                        key ? allCompetenceOptions.find(o => o.key === key) : undefined;
                    const canAdd = missions.length < maxMissions;
                    const canRemove = missions.length > minMissions;
                    // The development-plan tab label already titles this section, so no
                    // SectionHeader here. Each mission is edited via its own row pencil.
                    return (
                    <Box>
                        {isEditable && (
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                spacing={2}
                                sx={{ mb: 1, flexWrap: 'wrap' }}
                            >
                                <Typography fontSize={12} color={t.textMuted} sx={{ whiteSpace: 'nowrap' }}>
                                    {getString('missionCountHint', { min: minMissions, max: maxMissions })}
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
                        {missions.length > 0 ? (
                            <Box sx={{ mb: 1.5 }}>
                                {missions.map((mission, idx) => {
                                    const comp = competenceFor(mission.dimension_key);
                                    const rowEditing = isEditable && editMissionIdx === idx;
                                    return (
                                    <Stack
                                        key={`mission-${idx}`}
                                        direction="row"
                                        alignItems="flex-start"
                                        spacing={0.75}
                                        sx={{ mb: 1, py: 0.5, px: 0.75, borderRadius: '6px', '&:hover': { bgcolor: t.accent + '10' } }}
                                    >
                                        <Typography fontSize={12} fontWeight={700} color={t.accent} sx={{ minWidth: 22, pt: '8px' }}>
                                            {idx + 1}.
                                        </Typography>
                                        {rowEditing ? (
                                            // Text input on the LEFT, competence selector on the RIGHT; both short and top-aligned.
                                            <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ flex: 1 }}>
                                                <TextField
                                                    size="small"
                                                    value={mission.text}
                                                    onChange={e => onUpdateMission(idx, e.target.value)}
                                                    placeholder={getString('typeMissionPlaceholder')}
                                                    multiline minRows={1} maxRows={4}
                                                    fullWidth
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
                                        ) : (
                                            <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ flex: 1, pt: '4px' }}>
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
                                        )}
                                        {isEditable && (
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
                            </Box>
                        ) : (!isEditable && (
                            <Typography fontSize={13} color={t.textMuted}>—</Typography>
                        ))}
                        {/* Hide the add row entirely once the max is reached — nothing
                            would be added anyway. Text on the left, competence on the right. */}
                        {isEditable && canAdd && (
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <TextField
                                    size="small"
                                    placeholder={getString('typeMissionPlaceholder')}
                                    value={newMissionText}
                                    onChange={e => onNewMissionTextChange(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            onAddMission(newMissionText, newMissionCompetence);
                                        }
                                    }}
                                    multiline minRows={1} maxRows={4}
                                    fullWidth
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
                                    disabled={!newMissionText.trim()}
                                    sx={{ textTransform: 'none', whiteSpace: 'nowrap', mt: '2px' }}
                                >
                                    {getString('addMission')}
                                </Button>
                            </Stack>
                        )}
                    </Box>
                    );
                })()}

                {dataTab === 6 && (
                    <TextSection
                        title={getString('requiredTrainings')}
                        value={trainings}
                        onChange={onTrainingsChange}
                        editable={isEditable}
                        editing={!!editSections.trainings}
                        onToggle={() => toggle('trainings')}
                        getString={getString}
                    />
                )}
            </Box>
        </Box>
    );
}
