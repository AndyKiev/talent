import { useState, type ReactNode } from 'react';
import {
    Box,
    Button,
    IconButton,
    Stack,
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
import { useTheme } from '../../theme/ThemeContext';

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
    // Development plan
    missions: string[];
    onUpdateMission: (index: number, value: string) => void;
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
    missions, onUpdateMission,
    trainings, onTrainingsChange,
}: Props) {
    const { t } = useTheme();
    // Which sections are currently in edit mode (inputs revealed). Read-only by
    // default — same on-demand pattern as the competence summary / dimension lists.
    const [editSections, setEditSections] = useState<Record<string, boolean>>({});
    const toggle = (key: string) => setEditSections(p => ({ ...p, [key]: !p[key] }));

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
                    const editing = isEditable && !!editSections.developmentPlan;
                    return (
                    <Box>
                        <SectionHeader
                            title={getString('developmentPlan')}
                            editable={isEditable}
                            editing={!!editSections.developmentPlan}
                            onToggle={() => toggle('developmentPlan')}
                            getString={getString}
                        />
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {missions.map((mission, idx) => (
                                editing ? (
                                    <TextField
                                        key={`mission-${idx}`}
                                        label={getString('mission', { num: idx + 1 })}
                                        value={mission}
                                        onChange={e => onUpdateMission(idx, e.target.value)}
                                        multiline minRows={5}
                                        sx={{ flex: '1 1 320px', minWidth: 280 }}
                                    />
                                ) : (
                                    <Box key={`mission-${idx}`} sx={{ flex: '1 1 320px', minWidth: 280 }}>
                                        <Typography fontSize={12} fontWeight={600} color={t.textMuted} mb={0.5}>
                                            {getString('mission', { num: idx + 1 })}
                                        </Typography>
                                        <Typography fontSize={13} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: mission ? t.text : t.textMuted }}>
                                            {mission || '—'}
                                        </Typography>
                                    </Box>
                                )
                            ))}
                        </Box>
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
