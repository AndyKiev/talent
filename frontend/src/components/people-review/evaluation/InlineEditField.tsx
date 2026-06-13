import { useState } from 'react';
import { Button, Stack, TextField } from '@mui/material';
import type { GetStringFn } from '../../../types/getStringFn';

interface Props {
    /** Text to pre-fill the editor with. */
    initialValue: string;
    /** Called with the trimmed text when the user confirms (never empty). */
    onSave: (text: string) => void;
    onCancel: () => void;
    getString: GetStringFn;
    /** Optional accent colour for the Save button (matches the competence colour). */
    color?: string;
}

/**
 * Inline editor for a single list item (fact / improvement / comment): a
 * multiline text field with Save / Cancel, mirroring the "add" inputs already
 * used around the people-review evaluation. Local draft state so typing doesn't
 * touch the parent until Save.
 */
export function InlineEditField({ initialValue, onSave, onCancel, getString, color }: Props) {
    const [text, setText] = useState(initialValue);
    const submit = () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        onSave(trimmed);
    };
    return (
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
            <TextField
                size="small"
                value={text}
                onChange={(e) => setText(e.target.value)}
                multiline
                minRows={2}
                fullWidth
                autoFocus
            />
            <Stack spacing={0.5} sx={{ mt: 0.25 }}>
                <Button
                    size="small"
                    variant="contained"
                    onClick={submit}
                    disabled={!text.trim()}
                    sx={{
                        textTransform: 'none', whiteSpace: 'nowrap',
                        ...(color && { bgcolor: color, '&:hover': { bgcolor: color } }),
                    }}
                >
                    {getString('save')}
                </Button>
                <Button
                    size="small"
                    onClick={onCancel}
                    sx={{ textTransform: 'none', whiteSpace: 'nowrap', color: 'text.secondary' }}
                >
                    {getString('cancel')}
                </Button>
            </Stack>
        </Stack>
    );
}
