import { useState } from 'react';
import {
    Box,
    Button,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import type { GetStringFn } from '../../../types/getStringFn';
import type { SummaryOption } from './evaluationHelpers';
import { InlineEditField } from './InlineEditField';

export function CompetenceSummarySection({
    title, accent, options, candidates, nameOf, colorOf, isEditable, getString,
    drafts, onDraftChange, onAddOption, onRemoveOption, onAddComment, onRemoveComment,
    onEditComment, onReorderOption, onSelectCompetence,
}: {
    title: string;
    accent: string;
    options: SummaryOption[];
    candidates: { key: string; name: string }[];
    nameOf: (key: string) => string;
    colorOf: (key: string) => string;
    isEditable: boolean;
    getString: GetStringFn;
    drafts: Record<string, string>;
    onDraftChange: (key: string, value: string) => void;
    onAddOption: (key: string) => void;
    onRemoveOption: (key: string) => void;
    onAddComment: (key: string, text: string) => void;
    onRemoveComment: (key: string, index: number) => void;
    onEditComment: (key: string, index: number, text: string) => void;
    onReorderOption: (fromIndex: number, toIndex: number) => void;
    onSelectCompetence: (key: string) => void;
}) {
    const [pick, setPick] = useState('');
    // Which comment row (competence key + index) is being edited inline; null when none.
    const [editing, setEditing] = useState<{ key: string; index: number } | null>(null);
    // Only ONE competence card may be open for editing at a time — its comment
    // input box (and per-comment controls) show only while it is the active one.
    const [editKey, setEditKey] = useState<string | null>(null);
    // Section-level edit toggle: the whole box is read-only until the user opts in
    // (so no input boxes / pickers are active by default). Mirrors the dimension
    // facts/improvements and the data tabs.
    const [sectionEditing, setSectionEditing] = useState(false);
    const editingActive = isEditable && sectionEditing;

    const exitSectionEdit = () => {
        setSectionEditing(false);
        setEditKey(null);
        setEditing(null);
        setPick('');
    };
    // Drag-to-reorder state (whole cards): index being dragged + current drop row.
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const submitComment = (key: string) => {
        const text = (drafts[key] ?? '').trim();
        if (!text) return;
        onAddComment(key, text);
        onDraftChange(key, '');
    };

    return (
        <Box sx={{ flex: '1 1 340px', minWidth: 300 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Typography fontSize={11} fontWeight={700} color={accent} textTransform="uppercase" letterSpacing="0.06em">
                    {title}
                </Typography>
                {isEditable && (
                    <Tooltip title={getString(sectionEditing ? 'doneEditing' : 'edit')}>
                        <IconButton
                            size="small"
                            onClick={() => (sectionEditing ? exitSectionEdit() : setSectionEditing(true))}
                            sx={{ p: 0.25, color: sectionEditing ? accent : undefined }}
                        >
                            {sectionEditing ? <DoneIcon sx={{ fontSize: 16 }} /> : <EditIcon sx={{ fontSize: 15 }} />}
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>

            {editingActive && candidates.length > 0 && (
                <Stack direction="row" spacing={1} mb={2}>
                    <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                        <InputLabel id={`add-${title}-label`}>{getString('selectCompetence')}</InputLabel>
                        <Select
                            variant="outlined"
                            labelId={`add-${title}-label`}
                            label={getString('selectCompetence')}
                            value={pick}
                            onChange={e => { setPick(e.target.value); onSelectCompetence(e.target.value); }}
                        >
                            {candidates.map(c => (
                                <MenuItem key={c.key} value={c.key}>{c.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="outlined" size="small" startIcon={<AddIcon />}
                        // Adding a competence opens it for editing right away.
                        onClick={() => { if (pick) { onAddOption(pick); setEditKey(pick); setPick(''); } }}
                        disabled={!pick}
                        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                    >
                        {getString('addFact')}
                    </Button>
                </Stack>
            )}

            <Stack spacing={1.5}>
                {options.map((opt, idx) => {
                    const color = colorOf(opt.dimension_key);
                    const isCardEditing = editingActive && editKey === opt.dimension_key;
                    return (
                    <Box
                        key={opt.dimension_key}
                        onDragOver={(e) => {
                            if (dragIndex == null || dragIndex === idx) return;
                            e.preventDefault();
                            if (dragOverIndex !== idx) setDragOverIndex(idx);
                        }}
                        onDragLeave={() => { if (dragOverIndex === idx) setDragOverIndex(null); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (dragIndex != null && dragIndex !== idx) onReorderOption(dragIndex, idx);
                            setDragIndex(null);
                            setDragOverIndex(null);
                        }}
                        sx={{
                            border: `1px solid ${color}33`,
                            borderRadius: '10px',
                            p: 1.5,
                            opacity: dragIndex === idx ? 0.4 : 1,
                            borderTop: dragOverIndex === idx ? `2px solid ${color}` : undefined,
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                                {editingActive && (
                                    <Tooltip title={getString('dragToReorder')}>
                                        <Box
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.effectAllowed = 'move';
                                                setDragIndex(idx);
                                            }}
                                            onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                                            sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', color: color, '&:active': { cursor: 'grabbing' } }}
                                        >
                                            <DragIndicatorIcon sx={{ fontSize: 16 }} />
                                        </Box>
                                    </Tooltip>
                                )}
                                <Typography fontSize={13} fontWeight={700} color={color} sx={{ wordBreak: 'break-word' }}>
                                    {nameOf(opt.dimension_key)}
                                </Typography>
                            </Stack>
                            {editingActive && (
                                <Stack direction="row" alignItems="center" spacing={0.25}>
                                    <Tooltip title={getString(isCardEditing ? 'doneEditing' : 'edit')}>
                                        <IconButton
                                            size="small"
                                            onClick={() => setEditKey(isCardEditing ? null : opt.dimension_key)}
                                            sx={{ p: 0.25, color: isCardEditing ? color : undefined }}
                                        >
                                            {isCardEditing ? <DoneIcon sx={{ fontSize: 16 }} /> : <EditIcon sx={{ fontSize: 15 }} />}
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={getString('removeOption')}>
                                        <IconButton
                                            size="small"
                                            onClick={() => { if (editKey === opt.dimension_key) setEditKey(null); onRemoveOption(opt.dimension_key); }}
                                            sx={{ p: 0.25 }}
                                        >
                                            <CloseIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            )}
                        </Stack>

                        {opt.comments.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                                {opt.comments.map((comment, cIdx) => (
                                    <Stack
                                        key={`${opt.dimension_key}-c-${cIdx}`}
                                        direction="row" alignItems="flex-start" spacing={0.5}
                                        sx={{ mb: 0.5, py: 0.25, px: 0.5, borderRadius: '6px', '&:hover': { bgcolor: color + '10' } }}
                                    >
                                        <Typography fontSize={12} fontWeight={700} color={color} sx={{ minWidth: 20, pt: editing?.key === opt.dimension_key && editing.index === cIdx ? '8px' : '2px' }}>
                                            {cIdx + 1}.
                                        </Typography>
                                        {isCardEditing && editing?.key === opt.dimension_key && editing.index === cIdx ? (
                                            <InlineEditField
                                                initialValue={comment}
                                                color={color}
                                                getString={getString}
                                                onSave={(text) => { onEditComment(opt.dimension_key, cIdx, text); setEditing(null); }}
                                                onCancel={() => setEditing(null)}
                                            />
                                        ) : (
                                            <>
                                                <Typography fontSize={13} sx={{ flex: 1, pt: '2px', wordBreak: 'break-word' }}>
                                                    {comment}
                                                </Typography>
                                                {isCardEditing && (
                                                    <Tooltip title={getString('edit')}>
                                                        <IconButton size="small" onClick={() => setEditing({ key: opt.dimension_key, index: cIdx })} sx={{ p: 0.25, mt: '-2px' }}>
                                                            <EditIcon sx={{ fontSize: 13 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {isCardEditing && (
                                                    <Tooltip title={getString('deleteComment')}>
                                                        <IconButton size="small" onClick={() => onRemoveComment(opt.dimension_key, cIdx)} sx={{ p: 0.25, mt: '-2px' }}>
                                                            <CloseIcon sx={{ fontSize: 13 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </>
                                        )}
                                    </Stack>
                                ))}
                            </Box>
                        )}

                        {isCardEditing && (
                            <Stack direction="row" spacing={2} alignItems="flex-start">
                                <TextField
                                    size="small"
                                    multiline minRows={2}
                                    placeholder={getString('typeCommentPlaceholder')}
                                    value={drafts[opt.dimension_key] ?? ''}
                                    onChange={e => onDraftChange(opt.dimension_key, e.target.value)}
                                    fullWidth
                                />
                                <Button
                                    variant="outlined" size="small" startIcon={<AddIcon />}
                                    onClick={() => submitComment(opt.dimension_key)}
                                    disabled={!(drafts[opt.dimension_key] ?? '').trim()}
                                    sx={{ textTransform: 'none', whiteSpace: 'nowrap', mt: 0.25 }}
                                >
                                    {getString('addComment')}
                                </Button>
                            </Stack>
                        )}
                    </Box>
                    );
                })}
            </Stack>
        </Box>
    );
}
