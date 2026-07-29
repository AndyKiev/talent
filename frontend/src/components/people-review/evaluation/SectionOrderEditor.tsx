// src/components/people-review/evaluation/SectionOrderEditor.tsx
//
// Shown INSTEAD of the three evaluation sections while reorder mode is on: the
// page collapses to three draggable strips, so the whole stacking is visible at
// once. Reuses the generic ReorderableList (drag + up/down/top/bottom).
import { Box, Stack, Typography } from '@mui/material';
import { ReorderableList } from '../ReorderableList';
import { useTheme } from '../../theme/useTheme';
import type { GetStringFn } from '../../../types/getStringFn';
import {
    EvaluationSection,
    sectionLabel,
    sectionMeta,
    sectionsFromIds,
} from './sectionOrder';

interface Props {
    order: EvaluationSection[];
    onChange: (order: EvaluationSection[]) => void;
    getString: GetStringFn;
}

export function SectionOrderEditor({ order, onChange, getString }: Props) {
    const { t } = useTheme();

    return (
        <Box
            sx={{
                mb: 3,
                p: 2.5,
                border: `1px solid ${t.borderLight}`,
                borderRadius: '12px',
                background: t.cardBg,
            }}
        >
            <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Typography fontWeight={700} color={t.text}>
                    {getString('sectionOrderTitle')}
                </Typography>
                <Typography variant="body2" color={t.textSecondary}>
                    {getString('sectionOrderHint')}
                </Typography>
            </Stack>

            {/* ReorderableList re-syncs its internal copy only when the SET of
                row ids changes — ours is always {1,2,3}, so a stored order
                arriving after mount would be ignored. Keying on the order forces
                the remount that re-seeds it. */}
            <ReorderableList
                key={order.join(',')}
                rows={order}
                getRowId={(section) => sectionMeta(section).id}
                getString={getString}
                positionLabel={(index) => String(index + 1)}
                renderRow={(section) => (
                    <Typography fontSize={14} fontWeight={600} color={t.text}>
                        {sectionLabel(getString, section)}
                    </Typography>
                )}
                onReorder={(orderedIds) => onChange(sectionsFromIds(orderedIds))}
            />
        </Box>
    );
}
