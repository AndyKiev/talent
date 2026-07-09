import { useMemo, useState, type ReactNode } from 'react';
import {
    Box,
    Button,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { ResponsiveTabs, type TabItem } from '../../ui/ResponsiveTabs';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';
import type { GetStringFn } from '../../../types/getStringFn';
import { useTheme } from '../../theme/ThemeContext';
import { EmployeeTrainingsPanel } from '../../employees/trainings/EmployeeTrainingsPanel';

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
    // Trainings — real assign+status list (shared with the Employees tab) plus
    // the pre-existing free-text notes field, stacked below it.
    employeeId: number | undefined;
    trainings: string;
    onTrainingsChange: (value: string) => void;
}

/** The personal-info / job-info / feedback / results / trainings tab strip.
    (The development plan is now a standalone section below the competence summary.) */
export function EmployeeDataTabs({
    dataTab, onDataTabChange, isEditable, getString,
    personalInfo, jobInfo,
    employeeFeedback, onEmployeeFeedbackChange, employeeFeedbackEditable,
    managerFeedback, onManagerFeedbackChange, managerFeedbackEditable,
    results, newResultText, onNewResultTextChange, onAddResult, onRemoveResult,
    employeeId, trainings, onTrainingsChange,
}: Props) {
    const { t } = useTheme();
    // Which sections are currently in edit mode (inputs revealed). Read-only by
    // default — same on-demand pattern as the competence summary / dimension lists.
    const [editSections, setEditSections] = useState<Record<string, boolean>>({});
    const toggle = (key: string) => setEditSections(p => ({ ...p, [key]: !p[key] }));

    const tabSx = { textTransform: 'none', fontWeight: 600, fontSize: 12 } as const;
    const TAB_ITEMS: TabItem[] = useMemo(() => [
        { label: getString('personalInfo'),      value: '0', sx: tabSx },
        { label: getString('jobInfo'),            value: '1', sx: tabSx },
        { label: getString('employeeFeedback'),   value: '2', sx: tabSx },
        { label: getString('managerFeedback'),    value: '3', sx: tabSx },
        { label: getString('resultsAchievements'),value: '4', sx: tabSx },
        { label: getString('trainings'),          value: '5', sx: tabSx },
    ], [getString]);

    return (
        <Box sx={{ mb: 3, border: `1px solid ${t.borderLight}`, borderRadius: '12px', overflow: 'hidden', background: t.cardBg }}>
            <ResponsiveTabs
                tabs={TAB_ITEMS}
                activeTab={String(dataTab)}
                onChange={(v) => onDataTabChange(Number(v))}
                tabsProps={{ sx: { borderBottom: `1px solid ${t.borderLight}` } }}
            />

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
                    const trainingsEditing = isEditable && !!editSections.trainings;
                    return (
                    <Box>
                        <SectionHeader
                            title={getString('trainings')}
                            editable={isEditable}
                            editing={trainingsEditing}
                            onToggle={() => toggle('trainings')}
                            getString={getString}
                        />

                        {employeeId && (
                            <Box sx={{ mb: 3 }}>
                                <EmployeeTrainingsPanel
                                    employeeId={employeeId}
                                    isEditable={trainingsEditing}
                                    getString={getString}
                                    compact
                                />
                            </Box>
                        )}

                        <Typography fontSize={12} fontWeight={600} color={t.textSecondary} sx={{ mb: 0.5 }}>
                            {getString('trainingNotes')}
                        </Typography>
                        {trainingsEditing ? (
                            <TextField value={trainings} onChange={e => onTrainingsChange(e.target.value)} fullWidth multiline minRows={5} />
                        ) : (
                            <Typography fontSize={13} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: trainings ? t.text : t.textMuted }}>
                                {trainings || '—'}
                            </Typography>
                        )}
                    </Box>
                    );
                })()}
            </Box>
        </Box>
    );
}