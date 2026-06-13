import { type ReactNode } from 'react';
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
import type { GetStringFn } from '../../../types/getStringFn';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
    dataTab: number;
    onDataTabChange: (value: number) => void;
    isEditable: boolean;
    getString: GetStringFn;
    // Personal-info / job-info tab content (built by the page; the data lives there).
    personalInfo: ReactNode;
    jobInfo: ReactNode;
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

/** The personal-info / job-info / feedback / results / development-plan / trainings tab strip. */
export function EmployeeDataTabs({
    dataTab, onDataTabChange, isEditable, getString,
    personalInfo, jobInfo,
    employeeFeedback, onEmployeeFeedbackChange,
    managerFeedback, onManagerFeedbackChange,
    results, newResultText, onNewResultTextChange, onAddResult, onRemoveResult,
    missions, onUpdateMission,
    trainings, onTrainingsChange,
}: Props) {
    const { t } = useTheme();

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
                    <TextField
                        label={getString('employeeFeedback')}
                        value={employeeFeedback}
                        onChange={e => onEmployeeFeedbackChange(e.target.value)}
                        fullWidth multiline minRows={5}
                        disabled={!isEditable}
                    />
                )}

                {dataTab === 3 && (
                    <TextField
                        label={getString('managerFeedback')}
                        value={managerFeedback}
                        onChange={e => onManagerFeedbackChange(e.target.value)}
                        fullWidth multiline minRows={5}
                        disabled={!isEditable}
                    />
                )}

                {dataTab === 4 && (
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

                {dataTab === 5 && (
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

                {dataTab === 6 && (
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
