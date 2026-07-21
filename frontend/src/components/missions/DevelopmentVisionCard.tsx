import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { fetchDevelopmentVision, type DevelopmentVision } from './missionApi';
import { DEVELOPMENT_VISION_QK } from '../../utils/queryKeys';
import type { GetStringFn } from '../../types/getStringFn';

interface Props {
    employeeId: number;
    /** The employee themselves (or admin/dev). Everyone else who can see the
     *  plan sees this read-only. */
    canAuthor: boolean;
    getString: GetStringFn;
    onSave: (text: string) => void;
    isSaving: boolean;
}

/**
 * The editable half, split out so it can be MOUNTED FRESH (keyed on the stored
 * value) whenever the server value changes. Seeding local state from props via
 * an effect would cause cascading renders and is lint-blocked in this project.
 */
function VisionEditor({
    initialText,
    getString,
    onSave,
    isSaving,
}: {
    initialText: string;
    getString: GetStringFn;
    onSave: (text: string) => void;
    isSaving: boolean;
}) {
    const [text, setText] = useState(initialText);
    const dirty = text.trim() !== initialText.trim();

    return (
        <Box sx={{ mt: 1 }}>
            <TextField
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={getString('developmentVisionHint')}
                multiline
                minRows={3}
                fullWidth
            />
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                <Button
                    variant="contained"
                    size="small"
                    onClick={() => onSave(text.trim())}
                    disabled={!dirty || !text.trim() || isSaving}
                    sx={{ textTransform: 'none' }}
                >
                    {getString('saveVision')}
                </Button>
            </Stack>
        </Box>
    );
}

/**
 * The employee's own statement of where they want to develop — the second half
 * (with mission comments) of their write surface, since missions themselves are
 * managed by the oversight manager.
 *
 * Employee-scoped, not per review session, so it stays valid between reviews.
 */
export function DevelopmentVisionCard({
    employeeId,
    canAuthor,
    getString,
    onSave,
    isSaving,
}: Props) {
    const { data: vision, isLoading } = useQuery<DevelopmentVision | null>({
        queryKey: DEVELOPMENT_VISION_QK(employeeId),
        queryFn: () => fetchDevelopmentVision(employeeId),
    });

    const storedText = vision?.text ?? '';

    return (
        <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
                <Typography variant="subtitle2" fontWeight={600}>
                    {getString('developmentVision')}
                </Typography>

                {canAuthor ? (
                    // Remount on every server-side change so the textarea starts
                    // from what is actually stored.
                    !isLoading && (
                        <VisionEditor
                            key={vision?.updated_at ?? 'empty'}
                            initialText={storedText}
                            getString={getString}
                            onSave={onSave}
                            isSaving={isSaving}
                        />
                    )
                ) : (
                    <Typography
                        variant="body2"
                        sx={{
                            mt: 1,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: storedText ? 'text.primary' : 'text.secondary',
                        }}
                    >
                        {storedText || '—'}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}
