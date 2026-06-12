import { type Dispatch, type SetStateAction } from 'react';
import {
    Box,
    Button,
    IconButton,
    Rating,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import type { GetStringFn } from '../../../types/getStringFn';
import { useTheme } from '../../theme/ThemeContext';
import { MAX_GRADE } from '../peopleReviewApi';
import {
    type LocalEval,
    type DraggedFact,
    type PendingMove,
    getDimColor,
    competenceName,
    evalMean,
    evalFilled,
} from './evaluationHelpers';

interface Props {
    visibleEvals: LocalEval[];
    localEvals: LocalEval[];
    activeTab: number;
    setActiveTab: Dispatch<SetStateAction<number>>;
    isEditable: boolean;
    getString: GetStringFn;
    draggedFact: DraggedFact | null;
    setDraggedFact: Dispatch<SetStateAction<DraggedFact | null>>;
    dragOverTab: number | null;
    setDragOverTab: Dispatch<SetStateAction<number | null>>;
    dragOverFactIndex: number | null;
    setDragOverFactIndex: Dispatch<SetStateAction<number | null>>;
    setPendingMove: Dispatch<SetStateAction<PendingMove | null>>;
    newFactTexts: Record<number, string>;
    setNewFactTexts: Dispatch<SetStateAction<Record<number, string>>>;
    setCriterion: (evalId: number, index: number, value: number | null) => void;
    addFact: (evalId: number, text: string) => void;
    removeFact: (evalId: number, index: number) => void;
    reorderFact: (evalId: number, from: number, toRow: number) => void;
    updateLocal: (id: number, field: keyof LocalEval, value: unknown) => void;
    isCompetencePicked: (key: string) => boolean;
    copyFactToSummary: (key: string, text: string) => void;
}

/** The per-competence dimension tabs with behaviour scoring, facts and improvement. */
export function DimensionPanel({
    visibleEvals, localEvals, activeTab, setActiveTab, isEditable, getString,
    draggedFact, setDraggedFact, dragOverTab, setDragOverTab,
    dragOverFactIndex, setDragOverFactIndex, setPendingMove,
    newFactTexts, setNewFactTexts,
    setCriterion, addFact, removeFact, reorderFact, updateLocal,
    isCompetencePicked, copyFactToSummary,
}: Props) {
    const { t } = useTheme();

    const activeEval = visibleEvals[activeTab];
    const activeColor = activeEval ? getDimColor(activeEval.dimension_key, activeTab) : t.accent;
    const activeMean = activeEval ? evalMean(activeEval) : null;
    const activeLevelPct = ((activeMean ?? 0) / MAX_GRADE) * 100;

    return (
        <Box sx={{ border: `1px solid ${t.borderLight}`, borderRadius: '12px', overflow: 'hidden', background: t.cardBg }}>
            <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                    borderBottom: `1px solid ${t.borderLight}`,
                    '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: activeColor },
                }}
            >
                {visibleEvals.map((e, idx) => {
                    const color = getDimColor(e.dimension_key, idx);
                    const filled = evalFilled(e);
                    const isDropTarget = draggedFact != null && draggedFact.evalId !== e.id;
                    return (
                        <Tab
                            key={e.id}
                            onDragOver={(ev) => {
                                if (!isDropTarget) return;
                                ev.preventDefault();
                                ev.dataTransfer.dropEffect = 'move';
                                if (dragOverTab !== idx) setDragOverTab(idx);
                            }}
                            onDragLeave={() => { if (dragOverTab === idx) setDragOverTab(null); }}
                            onDrop={(ev) => {
                                ev.preventDefault();
                                setDragOverTab(null);
                                if (!draggedFact || draggedFact.evalId === e.id) { setDraggedFact(null); return; }
                                const src = localEvals.find(le => le.id === draggedFact.evalId);
                                const fact = src?.facts[draggedFact.index];
                                if (fact == null) { setDraggedFact(null); return; }
                                setPendingMove({
                                    fromEvalId: draggedFact.evalId,
                                    index: draggedFact.index,
                                    fact,
                                    toEvalId: e.id,
                                    toTabIndex: idx,
                                    toName: competenceName(getString, e.dimension_key, e.dimension_name),
                                });
                                setDraggedFact(null);
                            }}
                            label={
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: filled ? color : `${color}44`, flexShrink: 0 }} />
                                    <span>{competenceName(getString, e.dimension_key, e.dimension_name)}</span>
                                </Stack>
                            }
                            sx={{
                                fontSize: 12,
                                fontWeight: activeTab === idx ? 700 : 500,
                                color: activeTab === idx ? color : t.textMuted,
                                textTransform: 'none',
                                minHeight: 48,
                                '&.Mui-selected': { color },
                                ...(dragOverTab === idx && isDropTarget && {
                                    bgcolor: `${color}22`,
                                    outline: `2px dashed ${color}`,
                                    outlineOffset: '-4px',
                                    borderRadius: '6px',
                                }),
                            }}
                        />
                    );
                })}
            </Tabs>

            {activeEval && (
                <Box sx={{ p: 3 }}>
                    {/* Dimension header */}
                    <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
                        <Box sx={{ width: 4, height: 26, borderRadius: 2, bgcolor: activeColor, flexShrink: 0 }} />
                        <Typography variant="h6" fontWeight={700} color={activeColor}>
                            {competenceName(getString, activeEval.dimension_key, activeEval.dimension_name)}
                        </Typography>
                    </Stack>

                    {/* Per-behaviour scoring — the competence level is their average */}
                    <Box sx={{ mb: 3 }}>
                        <Typography fontSize={13} fontWeight={600} color={t.textSecondary} mb={1}>
                            {`${getString('rateEachBehaviour')} (1–${MAX_GRADE})`}
                        </Typography>
                        <Stack spacing={1} mb={2}>
                            {activeEval.descriptors.map((desc, i) => (
                                <Stack
                                    key={i}
                                    direction="row"
                                    alignItems="center"
                                    spacing={1.5}
                                    sx={{
                                        py: 0.75, px: 1.25, borderRadius: '8px',
                                        border: `1px solid ${activeColor}22`,
                                        bgcolor: activeColor + '08',
                                    }}
                                >
                                    <Typography fontSize={12} fontWeight={700} color={activeColor} sx={{ minWidth: 18, pt: '1px' }}>
                                        {i + 1}.
                                    </Typography>
                                    <Typography fontSize={13} sx={{ flex: 1, wordBreak: 'break-word' }}>
                                        {desc}
                                    </Typography>
                                    <Rating
                                        value={activeEval.criterionScores[i] ?? 0}
                                        max={MAX_GRADE}
                                        onChange={(_, v) => { if (isEditable) setCriterion(activeEval.id, i, v); }}
                                        readOnly={!isEditable}
                                        sx={{ flexShrink: 0, '& .MuiRating-iconFilled': { color: activeColor }, '& .MuiRating-iconHover': { color: activeColor } }}
                                    />
                                    <Typography fontSize={13} fontWeight={700} color={activeColor} sx={{ width: 18, textAlign: 'right' }}>
                                        {activeEval.criterionScores[i] ?? '—'}
                                    </Typography>
                                </Stack>
                            ))}
                        </Stack>

                        {/* Competence level = arithmetic mean (no stars — value is fractional) */}
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Typography fontSize={13} fontWeight={700} color={t.textSecondary} sx={{ whiteSpace: 'nowrap' }}>
                                {getString('competenceLevel')}
                            </Typography>
                            <Box sx={{ flex: 1, maxWidth: 240, height: 10, borderRadius: 5, bgcolor: `${activeColor}22`, position: 'relative' }}>
                                <Box sx={{
                                    position: 'absolute', left: 0, top: 0, bottom: 0,
                                    width: `${activeLevelPct}%`, borderRadius: 5, bgcolor: activeColor,
                                    transition: 'width 0.3s ease',
                                }} />
                            </Box>
                            <Typography fontWeight={700} color={activeColor} fontSize={15} sx={{ minWidth: 64, textAlign: 'right' }}>
                                {activeMean != null ? activeMean.toFixed(2) : '—'}/{MAX_GRADE}
                            </Typography>
                        </Stack>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                        <Typography fontSize={13} fontWeight={600} color={t.textSecondary} mb={1}>
                            {getString('factsAndAchievements')}
                        </Typography>
                        {activeEval.facts.length > 0 && (
                            <Box sx={{ mb: 1.5 }}>
                                {activeEval.facts.map((fact, idx) => (
                                    <Stack
                                        key={`fact-${idx}`}
                                        direction="row"
                                        alignItems="flex-start"
                                        spacing={0.5}
                                        onDragOver={(e) => {
                                            if (!draggedFact || draggedFact.evalId !== activeEval.id) return;
                                            e.preventDefault();
                                            if (dragOverFactIndex !== idx) setDragOverFactIndex(idx);
                                        }}
                                        onDragLeave={() => { if (dragOverFactIndex === idx) setDragOverFactIndex(null); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setDragOverFactIndex(null);
                                            if (draggedFact && draggedFact.evalId === activeEval.id) {
                                                reorderFact(activeEval.id, draggedFact.index, idx);
                                            }
                                            setDraggedFact(null);
                                        }}
                                        sx={{
                                            mb: 0.5,
                                            py: 0.5,
                                            px: 0.75,
                                            borderRadius: '6px',
                                            opacity: draggedFact?.evalId === activeEval.id && draggedFact?.index === idx ? 0.4 : 1,
                                            borderTop: dragOverFactIndex === idx ? `2px solid ${activeColor}` : '2px solid transparent',
                                            '&:hover': { bgcolor: activeColor + '10' },
                                        }}
                                    >
                                        {isEditable && (
                                            <Tooltip title={getString('dragFactReorderOrMove')}>
                                                <Box
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.effectAllowed = 'move';
                                                        e.dataTransfer.setData('text/plain', fact);
                                                        setDraggedFact({ evalId: activeEval.id, index: idx });
                                                    }}
                                                    onDragEnd={() => { setDraggedFact(null); setDragOverTab(null); setDragOverFactIndex(null); }}
                                                    sx={{ display: 'flex', alignItems: 'center', pt: '2px', cursor: 'grab', color: t.textMuted, '&:active': { cursor: 'grabbing' } }}
                                                >
                                                    <DragIndicatorIcon sx={{ fontSize: 16 }} />
                                                </Box>
                                            </Tooltip>
                                        )}
                                        <Typography
                                            fontSize={12}
                                            fontWeight={700}
                                            color={activeColor}
                                            sx={{ minWidth: 22, pt: '2px' }}
                                        >
                                            {idx + 1}.
                                        </Typography>
                                        <Typography fontSize={13} sx={{ flex: 1, pt: '2px', wordBreak: 'break-word' }}>
                                            {fact}
                                        </Typography>
                                        {isEditable && isCompetencePicked(activeEval.dimension_key) && (
                                            <Tooltip title={getString('copyToSummaryComment')}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => copyFactToSummary(activeEval.dimension_key, fact)}
                                                    sx={{ p: 0.25, mt: '-2px' }}
                                                >
                                                    <ContentCopyIcon sx={{ fontSize: 13 }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {isEditable && (
                                            <Tooltip title={getString('deleteFact')}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removeFact(activeEval.id, idx)}
                                                    sx={{ p: 0.25, mt: '-2px' }}
                                                >
                                                    <CloseIcon sx={{ fontSize: 14 }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                ))}
                            </Box>
                        )}
                        {isEditable && (
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <TextField
                                    size="small"
                                    placeholder={getString('typeFactPlaceholder')}
                                    value={newFactTexts[activeEval.id] ?? ''}
                                    onChange={e =>
                                        setNewFactTexts(prev => ({ ...prev, [activeEval.id]: e.target.value }))
                                    }
                                    multiline
                                    minRows={2}
                                    fullWidth
                                />
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => addFact(activeEval.id, newFactTexts[activeEval.id] ?? '')}
                                    disabled={!(newFactTexts[activeEval.id] ?? '').trim()}
                                    sx={{ textTransform: 'none', whiteSpace: 'nowrap', mt: 0.5 }}
                                >
                                    {getString('addFact')}
                                </Button>
                            </Stack>
                        )}
                    </Box>
                    <TextField
                        label={getString('areasForImprovement')}
                        value={activeEval.improvement}
                        onChange={e => updateLocal(activeEval.id, 'improvement', e.target.value)}
                        fullWidth multiline rows={2}
                        disabled={!isEditable}
                    />

                    {/* Prev / Next tab */}
                    <Stack direction="row" justifyContent="space-between" mt={2.5}>
                        <Button size="small" disabled={activeTab === 0}
                            onClick={() => setActiveTab(p => p - 1)}
                            sx={{ textTransform: 'none', color: t.textMuted }}>
                            ← {getString('previousDimension')}
                        </Button>
                        <Button size="small" disabled={activeTab === visibleEvals.length - 1}
                            onClick={() => setActiveTab(p => p + 1)}
                            sx={{ textTransform: 'none', color: activeColor }}>
                            {getString('nextDimension')} →
                        </Button>
                    </Stack>
                </Box>
            )}
        </Box>
    );
}
