import { useEffect, useState } from 'react';
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
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import type { GetStringFn } from '../../../types/getStringFn';
import type { DimensionOption } from './evaluationHelpers';
import { InlineEditField } from './InlineEditField';

/**
 * One side of the dimensions singled out for this employee in this review —
 * the strong list or the to-develop list. Both sides render this same component;
 * `title` and `accent` are what differ.
 *
 * Keyed on `dimension_key` throughout (React keys, the picker, the per-card edit
 * state). The `dimension_id` each option also carries is only for the write
 * path, so nothing here needs it.
 */
export function RseDimensionSection({
    title, accent, options, candidates, nameOf, colorOf, isEditable, getString,
    drafts, onDraftChange, onAddOption, onRemoveOption, onAddComment, onRemoveComment,
    onEditComment, onReorderOption, onSelectDimension, onOpenCardChange,
}: {
    title: string;
    accent: string;
    options: DimensionOption[];
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
    onSelectDimension: (key: string) => void;
    /** Reports which card currently HAS a visible comment input (null when none).
     *  The copy-to-summary buttons in the competence panel below refuse to write
     *  into a card that is not open, so they need this. */
    onOpenCardChange: (key: string | null) => void;
}) {
    const [pick, setPick] = useState('');
    // Which comment row (dimension key + index) is being edited inline; null when none.
    const [editing, setEditing] = useState<{ key: string; index: number } | null>(null);
    // Only ONE dimension card may be open for editing at a time — its comment
    // input box (and per-comment controls) show only while it is the active one.
    const [editKey, setEditKey] = useState<string | null>(null);
    // Section-level edit toggle: the whole box is read-only until the user opts in
    // (so no input boxes / pickers are active by default). Mirrors the dimension
    // facts/improvements and the data tabs.
    const [sectionEditing, setSectionEditing] = useState(false);
    const editingActive = isEditable && sectionEditing;

    // Mirror the open card upward. Derived, so it stays correct however the card
    // closes — the Done toggle, removing the option, or leaving section edit.
    // The cleanup matters: if this section unmounts with a card still open (the
    // section-reorder mode swaps both sides for draggable strips), a stale key
    // would leave the copy buttons writing into an input nobody can see again.
    const openCard = editingActive ? editKey : null;
    useEffect(() => {
        onOpenCardChange(openCard);
        return () => onOpenCardChange(null);
    }, [openCard, onOpenCardChange]);

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
                            onChange={e => { setPick(e.target.value); onSelectDimension(e.target.value); }}
                            // Without this the menu locks body scroll, and the whole
                            // page jumps sideways by the scrollbar width on open.
                            MenuProps={{ disableScrollLock: true }}
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
                                <Stack spacing={0.5} sx={{ mt: 0.25 }}>
                                    {/* Clear first: lines arrive here by the copy
                                        button as well as by typing, so undoing a
                                        wrong copy must not mean selecting text. */}
                                    <Button
                                        variant="text" size="small" startIcon={<BackspaceOutlinedIcon />}
                                        onClick={() => onDraftChange(opt.dimension_key, '')}
                                        disabled={!(drafts[opt.dimension_key] ?? '').trim()}
                                        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                                    >
                                        {getString('clearComment')}
                                    </Button>
                                    <Button
                                        variant="outlined" size="small" startIcon={<AddIcon />}
                                        onClick={() => submitComment(opt.dimension_key)}
                                        disabled={!(drafts[opt.dimension_key] ?? '').trim()}
                                        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                                    >
                                        {getString('addComment')}
                                    </Button>
                                </Stack>
                            </Stack>
                        )}
                    </Box>
                    );
                })}
            </Stack>
        </Box>
    );
}
