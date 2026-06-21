import { useState, type Dispatch, type SetStateAction } from 'react';
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
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import type { GetStringFn } from '../../../types/getStringFn';
import { useTheme } from '../../theme/ThemeContext';
import { InlineEditField } from './InlineEditField';
import { MAX_GRADE } from '../peopleReviewApi';
import {
    type LocalEval,
    type DraggedItem,
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
    draggedItem: DraggedItem | null;
    setDraggedItem: Dispatch<SetStateAction<DraggedItem | null>>;
    dragOverTab: number | null;
    setDragOverTab: Dispatch<SetStateAction<number | null>>;
    dragOverFactIndex: number | null;
    setDragOverFactIndex: Dispatch<SetStateAction<number | null>>;
    setPendingMove: Dispatch<SetStateAction<PendingMove | null>>;
    newFactTexts: Record<number, string>;
    setNewFactTexts: Dispatch<SetStateAction<Record<number, string>>>;
    newImprovementTexts: Record<number, string>;
    setNewImprovementTexts: Dispatch<SetStateAction<Record<number, string>>>;
    setCriterion: (evalId: number, index: number, value: number | null) => void;
    addFact: (evalId: number, text: string) => void;
    removeFact: (evalId: number, index: number) => void;
    editFact: (evalId: number, index: number, text: string) => void;
    reorderFact: (evalId: number, from: number, toRow: number) => void;
    addImprovement: (evalId: number, text: string) => void;
    removeImprovement: (evalId: number, index: number) => void;
    editImprovement: (evalId: number, index: number, text: string) => void;
    reorderImprovement: (evalId: number, from: number, toRow: number) => void;
    isStrongPicked: (key: string) => boolean;
    isDevelopPicked: (key: string) => boolean;
    copyFactToStrong: (key: string, text: string) => void;
    copyImprovementToDevelop: (key: string, text: string) => void;
}

/** The per-competence dimension tabs with behaviour scoring, facts and improvement. */
export function DimensionPanel({
    visibleEvals, localEvals, activeTab, setActiveTab, isEditable, getString,
    draggedItem, setDraggedItem, dragOverTab, setDragOverTab,
    dragOverFactIndex, setDragOverFactIndex, setPendingMove,
    newFactTexts, setNewFactTexts,
    newImprovementTexts, setNewImprovementTexts,
    setCriterion, addFact, removeFact, editFact, reorderFact,
    addImprovement, removeImprovement, editImprovement, reorderImprovement,
    isStrongPicked, isDevelopPicked, copyFactToStrong, copyImprovementToDevelop,
}: Props) {
    const { t } = useTheme();

    // Row-highlight index while reordering within the improvement list (visual
    // only; the dragged item itself lives in the shared `draggedItem` state).
    const [dragOverImpIndex, setDragOverImpIndex] = useState<number | null>(null);

    // Which existing fact / improvement row (by competence id + index) is being
    // edited inline; null when none. Cleared on save/cancel.
    const [editingFact, setEditingFact] = useState<{ id: number; index: number } | null>(null);
    const [editingImp, setEditingImp] = useState<{ id: number; index: number } | null>(null);

    const activeEval = visibleEvals[activeTab];
    const activeColor = activeEval ? getDimColor(activeEval.dimension_key, activeTab, activeEval.dimension_color) : t.accent;
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
                    const color = getDimColor(e.dimension_key, idx, e.dimension_color);
                    const filled = evalFilled(e);
                    const isDropTarget = draggedItem != null && draggedItem.evalId !== e.id;
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
                                if (!draggedItem || draggedItem.evalId === e.id) { setDraggedItem(null); return; }
                                const src = localEvals.find(le => le.id === draggedItem.evalId);
                                const list = draggedItem.kind === 'fact' ? src?.facts : src?.improvements;
                                const text = list?.[draggedItem.index];
                                if (text == null) { setDraggedItem(null); return; }
                                setPendingMove({
                                    kind: draggedItem.kind,
                                    fromEvalId: draggedItem.evalId,
                                    index: draggedItem.index,
                                    text,
                                    toEvalId: e.id,
                                    toTabIndex: idx,
                                    toName: competenceName(getString, e.dimension_key, e.dimension_name),
                                });
                                setDraggedItem(null);
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
                                            if (draggedItem?.kind !== 'fact' || draggedItem.evalId !== activeEval.id) return;
                                            e.preventDefault();
                                            if (dragOverFactIndex !== idx) setDragOverFactIndex(idx);
                                        }}
                                        onDragLeave={() => { if (dragOverFactIndex === idx) setDragOverFactIndex(null); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setDragOverFactIndex(null);
                                            if (draggedItem?.kind === 'fact' && draggedItem.evalId === activeEval.id) {
                                                reorderFact(activeEval.id, draggedItem.index, idx);
                                            }
                                            setDraggedItem(null);
                                        }}
                                        sx={{
                                            mb: 0.5,
                                            py: 0.5,
                                            px: 0.75,
                                            borderRadius: '6px',
                                            opacity: draggedItem?.kind === 'fact' && draggedItem.evalId === activeEval.id && draggedItem.index === idx ? 0.4 : 1,
                                            borderTop: dragOverFactIndex === idx ? `2px solid ${activeColor}` : '2px solid transparent',
                                            '&:hover': { bgcolor: activeColor + '10' },
                                        }}
                                    >
                                        {isEditable && editingFact?.id === activeEval.id && editingFact.index === idx ? (
                                            <>
                                                <Typography fontSize={12} fontWeight={700} color={activeColor} sx={{ minWidth: 22, pt: '8px' }}>
                                                    {idx + 1}.
                                                </Typography>
                                                <InlineEditField
                                                    initialValue={fact}
                                                    color={activeColor}
                                                    getString={getString}
                                                    onSave={(text) => { editFact(activeEval.id, idx, text); setEditingFact(null); }}
                                                    onCancel={() => setEditingFact(null)}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                {isEditable && (
                                                    <Tooltip title={getString('dragFactReorderOrMove')}>
                                                        <Box
                                                            draggable
                                                            onDragStart={(e) => {
                                                                e.dataTransfer.effectAllowed = 'move';
                                                                e.dataTransfer.setData('text/plain', fact);
                                                                setDraggedItem({ kind: 'fact', evalId: activeEval.id, index: idx });
                                                            }}
                                                            onDragEnd={() => { setDraggedItem(null); setDragOverTab(null); setDragOverFactIndex(null); }}
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
                                                {isEditable && (
                                                    <Tooltip title={getString('edit')}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setEditingFact({ id: activeEval.id, index: idx })}
                                                            sx={{ p: 0.25, mt: '-2px' }}
                                                        >
                                                            <EditIcon sx={{ fontSize: 14 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {isEditable && isStrongPicked(activeEval.dimension_key) && (
                                                    <Tooltip title={getString('copyFactToStrongSummary')}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => copyFactToStrong(activeEval.dimension_key, fact)}
                                                            sx={{ p: 0.25, mt: '-2px' }}
                                                        >
                                                            <KeyboardDoubleArrowUpIcon sx={{ fontSize: 15 }} />
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
                                            </>
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
                    {/* Directions for improvement — its own card (uses the competence
                        colour) + icon so it reads distinctly from the facts list above;
                        supports reorder within the competence AND cross-tab move like facts.
                        Hidden entirely when read-only and empty, so presentation mode shows
                        no stray box (mirrors facts having no input then). */}
                    {(isEditable || activeEval.improvements.length > 0) && (
                    <Box
                        sx={{
                            mb: 2,
                            p: 1.75,
                            borderRadius: '10px',
                            border: `1px solid ${activeColor}33`,
                            bgcolor: `${activeColor}0A`,
                        }}
                    >
                        <Stack direction="row" spacing={0.75} alignItems="center" mb={1}>
                            <TrendingUpIcon sx={{ fontSize: 18, color: activeColor }} />
                            <Typography fontSize={13} fontWeight={700} color={activeColor}>
                                {getString('areasForImprovement')}
                            </Typography>
                        </Stack>
                        {activeEval.improvements.length > 0 && (
                            <Box sx={{ mb: 1.5 }}>
                                {activeEval.improvements.map((imp, idx) => (
                                    <Stack
                                        key={`imp-${idx}`}
                                        direction="row"
                                        alignItems="flex-start"
                                        spacing={0.5}
                                        onDragOver={(e) => {
                                            if (draggedItem?.kind !== 'improvement' || draggedItem.evalId !== activeEval.id) return;
                                            e.preventDefault();
                                            if (dragOverImpIndex !== idx) setDragOverImpIndex(idx);
                                        }}
                                        onDragLeave={() => { if (dragOverImpIndex === idx) setDragOverImpIndex(null); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setDragOverImpIndex(null);
                                            if (draggedItem?.kind === 'improvement' && draggedItem.evalId === activeEval.id) {
                                                reorderImprovement(activeEval.id, draggedItem.index, idx);
                                            }
                                            setDraggedItem(null);
                                        }}
                                        sx={{
                                            mb: 0.5,
                                            py: 0.5,
                                            px: 0.75,
                                            borderRadius: '6px',
                                            opacity: draggedItem?.kind === 'improvement' && draggedItem.evalId === activeEval.id && draggedItem.index === idx ? 0.4 : 1,
                                            borderTop: dragOverImpIndex === idx ? `2px solid ${activeColor}` : '2px solid transparent',
                                            '&:hover': { bgcolor: activeColor + '14' },
                                        }}
                                    >
                                        {isEditable && editingImp?.id === activeEval.id && editingImp.index === idx ? (
                                            <>
                                                <Typography fontSize={12} fontWeight={700} color={activeColor} sx={{ minWidth: 22, pt: '8px' }}>
                                                    {idx + 1}.
                                                </Typography>
                                                <InlineEditField
                                                    initialValue={imp}
                                                    color={activeColor}
                                                    getString={getString}
                                                    onSave={(text) => { editImprovement(activeEval.id, idx, text); setEditingImp(null); }}
                                                    onCancel={() => setEditingImp(null)}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                {isEditable && (
                                                    <Tooltip title={getString('dragFactReorderOrMove')}>
                                                        <Box
                                                            draggable
                                                            onDragStart={(e) => {
                                                                e.dataTransfer.effectAllowed = 'move';
                                                                e.dataTransfer.setData('text/plain', imp);
                                                                setDraggedItem({ kind: 'improvement', evalId: activeEval.id, index: idx });
                                                            }}
                                                            onDragEnd={() => { setDraggedItem(null); setDragOverTab(null); setDragOverImpIndex(null); }}
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
                                                    {imp}
                                                </Typography>
                                                {isEditable && (
                                                    <Tooltip title={getString('edit')}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setEditingImp({ id: activeEval.id, index: idx })}
                                                            sx={{ p: 0.25, mt: '-2px' }}
                                                        >
                                                            <EditIcon sx={{ fontSize: 14 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {isEditable && isDevelopPicked(activeEval.dimension_key) && (
                                                    <Tooltip title={getString('copyImprovementToDevelopSummary')}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => copyImprovementToDevelop(activeEval.dimension_key, imp)}
                                                            sx={{ p: 0.25, mt: '-2px' }}
                                                        >
                                                            <KeyboardDoubleArrowUpIcon sx={{ fontSize: 15 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {isEditable && (
                                                    <Tooltip title={getString('delete')}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => removeImprovement(activeEval.id, idx)}
                                                            sx={{ p: 0.25, mt: '-2px' }}
                                                        >
                                                            <CloseIcon sx={{ fontSize: 14 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </>
                                        )}
                                    </Stack>
                                ))}
                            </Box>
                        )}
                        {isEditable && (
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <TextField
                                    size="small"
                                    placeholder={getString('typeImprovementPlaceholder')}
                                    value={newImprovementTexts[activeEval.id] ?? ''}
                                    onChange={e =>
                                        setNewImprovementTexts(prev => ({ ...prev, [activeEval.id]: e.target.value }))
                                    }
                                    multiline
                                    minRows={2}
                                    fullWidth
                                />
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => addImprovement(activeEval.id, newImprovementTexts[activeEval.id] ?? '')}
                                    disabled={!(newImprovementTexts[activeEval.id] ?? '').trim()}
                                    sx={{
                                        textTransform: 'none', whiteSpace: 'nowrap', mt: 0.5,
                                        color: activeColor, borderColor: `${activeColor}66`,
                                        '&:hover': { borderColor: activeColor, bgcolor: `${activeColor}0A` },
                                    }}
                                >
                                    {getString('add')}
                                </Button>
                            </Stack>
                        )}
                    </Box>
                    )}

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
