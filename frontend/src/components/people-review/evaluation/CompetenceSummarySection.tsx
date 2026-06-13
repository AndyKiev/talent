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
import type { GetStringFn } from '../../../types/getStringFn';
import type { SummaryOption } from './evaluationHelpers';
import { InlineEditField } from './InlineEditField';

export function CompetenceSummarySection({
    title, accent, options, candidates, nameOf, colorOf, isEditable, getString,
    drafts, onDraftChange, onAddOption, onRemoveOption, onAddComment, onRemoveComment,
    onEditComment, onSelectCompetence,
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
    onSelectCompetence: (key: string) => void;
}) {
    const [pick, setPick] = useState('');
    // Which comment row (competence key + index) is being edited inline; null when none.
    const [editing, setEditing] = useState<{ key: string; index: number } | null>(null);

    const submitComment = (key: string) => {
        const text = (drafts[key] ?? '').trim();
        if (!text) return;
        onAddComment(key, text);
        onDraftChange(key, '');
    };

    return (
        <Box sx={{ flex: '1 1 340px', minWidth: 300 }}>
            <Typography fontSize={11} fontWeight={700} color={accent} mb={1.5} textTransform="uppercase" letterSpacing="0.06em">
                {title}
            </Typography>

            {isEditable && candidates.length > 0 && (
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
                        onClick={() => { if (pick) { onAddOption(pick); setPick(''); } }}
                        disabled={!pick}
                        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                    >
                        {getString('addFact')}
                    </Button>
                </Stack>
            )}

            <Stack spacing={1.5}>
                {options.map(opt => {
                    const color = colorOf(opt.dimension_key);
                    return (
                    <Box key={opt.dimension_key} sx={{ border: `1px solid ${color}33`, borderRadius: '10px', p: 1.5 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                            <Typography fontSize={13} fontWeight={700} color={color}>
                                {nameOf(opt.dimension_key)}
                            </Typography>
                            {isEditable && (
                                <Tooltip title={getString('removeOption')}>
                                    <IconButton size="small" onClick={() => onRemoveOption(opt.dimension_key)} sx={{ p: 0.25 }}>
                                        <CloseIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Stack>

                        {opt.comments.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                                {opt.comments.map((comment, idx) => (
                                    <Stack
                                        key={`${opt.dimension_key}-c-${idx}`}
                                        direction="row" alignItems="flex-start" spacing={0.5}
                                        sx={{ mb: 0.5, py: 0.25, px: 0.5, borderRadius: '6px', '&:hover': { bgcolor: color + '10' } }}
                                    >
                                        <Typography fontSize={12} fontWeight={700} color={color} sx={{ minWidth: 20, pt: editing?.key === opt.dimension_key && editing.index === idx ? '8px' : '2px' }}>
                                            {idx + 1}.
                                        </Typography>
                                        {isEditable && editing?.key === opt.dimension_key && editing.index === idx ? (
                                            <InlineEditField
                                                initialValue={comment}
                                                color={color}
                                                getString={getString}
                                                onSave={(text) => { onEditComment(opt.dimension_key, idx, text); setEditing(null); }}
                                                onCancel={() => setEditing(null)}
                                            />
                                        ) : (
                                            <>
                                                <Typography fontSize={13} sx={{ flex: 1, pt: '2px', wordBreak: 'break-word' }}>
                                                    {comment}
                                                </Typography>
                                                {isEditable && (
                                                    <Tooltip title={getString('edit')}>
                                                        <IconButton size="small" onClick={() => setEditing({ key: opt.dimension_key, index: idx })} sx={{ p: 0.25, mt: '-2px' }}>
                                                            <EditIcon sx={{ fontSize: 13 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {isEditable && (
                                                    <Tooltip title={getString('deleteComment')}>
                                                        <IconButton size="small" onClick={() => onRemoveComment(opt.dimension_key, idx)} sx={{ p: 0.25, mt: '-2px' }}>
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

                        {isEditable && (
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
