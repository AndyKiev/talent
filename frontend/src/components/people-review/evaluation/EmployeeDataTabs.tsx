import { type Dispatch, type SetStateAction } from 'react';
import {
    Box,
    Button,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import type { GetStringFn } from '../../../types/getStringFn';
import { useTheme } from '../../theme/ThemeContext';
import type { LanguageLevel } from '../peopleReviewApi';
import { FOREIGN_LANGUAGES } from './evaluationHelpers';

interface Props {
    dataTab: number;
    onDataTabChange: (value: number) => void;
    isEditable: boolean;
    getString: GetStringFn;
    // Foreign languages
    langLevels: LanguageLevel[];
    langSel: Record<string, number | null>;
    setLangSel: Dispatch<SetStateAction<Record<string, number | null>>>;
    // Feedback
    employeeFeedback: string;
    onEmployeeFeedbackChange: (value: string) => void;
    managerFeedback: string;
    onManagerFeedbackChange: (value: string) => void;
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

/** The languages / feedback / results / development-plan / trainings tab strip. */
export function EmployeeDataTabs({
    dataTab, onDataTabChange, isEditable, getString,
    langLevels, langSel, setLangSel,
    employeeFeedback, onEmployeeFeedbackChange,
    managerFeedback, onManagerFeedbackChange,
    results, newResultText, onNewResultTextChange, onAddResult, onRemoveResult,
    missions, onUpdateMission,
    trainings, onTrainingsChange,
}: Props) {
    const { t } = useTheme();

    // Translate CEFR level label/hint by code, falling back to the DB value.
    const translatedOr = (key: string, fallback: string) => {
        const v = getString(key);
        return v && v !== key ? v : fallback;
    };
    const langLevelLabel = (code: string, fallback: string) => translatedOr(`langLevelLabel${code}`, fallback);
    const langLevelHint = (code: string, fallback: string) => translatedOr(`langLevelHint${code}`, fallback);

    return (
        <Box sx={{ mb: 3, border: `1px solid ${t.borderLight}`, borderRadius: '12px', overflow: 'hidden', background: t.cardBg }}>
            <Tabs
                value={dataTab}
                onChange={(_, v) => onDataTabChange(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: `1px solid ${t.borderLight}` }}
            >
                <Tab label={getString('foreignLanguages')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                <Tab label={getString('employeeFeedback')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                <Tab label={getString('managerFeedback')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                <Tab label={getString('resultsAchievements')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                <Tab label={getString('developmentPlan')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                <Tab label={getString('requiredTrainings')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
            </Tabs>

            <Box sx={{ p: 3 }}>
                {dataTab === 0 && (
                    <>
                        <Typography fontSize={12} color={t.textMuted} mb={2}>
                            {getString('foreignLanguagesHint')}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                            {FOREIGN_LANGUAGES.map(({ key, labelKey }) => {
                                const selId = langSel[key] ?? null;
                                const selected = langLevels.find(l => l.id === selId);
                                return (
                                    <Stack key={key} direction="row" spacing={0.5} alignItems="center">
                                        <FormControl size="small" sx={{ minWidth: 190 }}>
                                            <InputLabel id={`lang-${key}-label`}>{getString(labelKey)}</InputLabel>
                                            <Select
                                                variant="outlined"
                                                labelId={`lang-${key}-label`}
                                                label={getString(labelKey)}
                                                value={selId == null ? '' : String(selId)}
                                                disabled={!isEditable}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setLangSel(prev => ({ ...prev, [key]: v === '' ? null : Number(v) }));
                                                }}
                                            >
                                                <MenuItem value=""><em>—</em></MenuItem>
                                                {langLevels.map(l => {
                                                    const label = langLevelLabel(l.code, l.label);
                                                    const hint = langLevelHint(l.code, l.hint);
                                                    return (
                                                        <MenuItem key={l.id} value={String(l.id)}>
                                                            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                                                                <span>{l.code}{label ? ` · ${label}` : ''}</span>
                                                                {hint && (
                                                                    <Tooltip title={hint} placement="right" arrow>
                                                                        <InfoOutlinedIcon
                                                                            fontSize="small"
                                                                            sx={{ ml: 'auto', color: t.textMuted, cursor: 'help' }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </Tooltip>
                                                                )}
                                                            </Stack>
                                                        </MenuItem>
                                                    );
                                                })}
                                            </Select>
                                        </FormControl>
                                        <Tooltip
                                            placement="top"
                                            arrow
                                            title={selected?.hint
                                                ? <span><strong>{selected.code}</strong> — {langLevelHint(selected.code, selected.hint)}</span>
                                                : getString('selectLevel')}
                                        >
                                            <InfoOutlinedIcon
                                                fontSize="small"
                                                sx={{ color: t.textMuted, opacity: selected ? 1 : 0.4, cursor: 'help', flexShrink: 0 }}
                                            />
                                        </Tooltip>
                                    </Stack>
                                );
                            })}
                        </Box>
                    </>
                )}

                {dataTab === 1 && (
                    <TextField
                        label={getString('employeeFeedback')}
                        value={employeeFeedback}
                        onChange={e => onEmployeeFeedbackChange(e.target.value)}
                        fullWidth multiline minRows={5}
                        disabled={!isEditable}
                    />
                )}

                {dataTab === 2 && (
                    <TextField
                        label={getString('managerFeedback')}
                        value={managerFeedback}
                        onChange={e => onManagerFeedbackChange(e.target.value)}
                        fullWidth multiline minRows={5}
                        disabled={!isEditable}
                    />
                )}

                {dataTab === 3 && (
                    <Box>
                        {results.length > 0 && (
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
                                        {isEditable && (
                                            <Tooltip title={getString('deleteFact')}>
                                                <IconButton size="small" onClick={() => onRemoveResult(idx)} sx={{ p: 0.25, mt: '-2px' }}>
                                                    <CloseIcon sx={{ fontSize: 14 }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                ))}
                            </Box>
                        )}
                        {isEditable && (
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
                )}

                {dataTab === 4 && (
                    <Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {missions.map((mission, idx) => (
                                <TextField
                                    key={`mission-${idx}`}
                                    label={getString('mission', { num: idx + 1 })}
                                    value={mission}
                                    onChange={e => onUpdateMission(idx, e.target.value)}
                                    multiline minRows={5}
                                    disabled={!isEditable}
                                    sx={{ flex: '1 1 320px', minWidth: 280 }}
                                />
                            ))}
                        </Box>
                    </Box>
                )}

                {dataTab === 5 && (
                    <TextField
                        label={getString('requiredTrainings')}
                        value={trainings}
                        onChange={e => onTrainingsChange(e.target.value)}
                        fullWidth multiline minRows={5}
                        disabled={!isEditable}
                    />
                )}
            </Box>
        </Box>
    );
}
