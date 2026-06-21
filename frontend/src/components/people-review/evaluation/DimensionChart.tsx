import { Box, Typography } from '@mui/material';
import type { GetStringFn } from '../../../types/getStringFn';
import { MAX_GRADE } from '../peopleReviewApi';
import { type LocalEval, getDimColor, competenceName, evalMean } from './evaluationHelpers';

export function DimensionChart({ evals, getString }: { evals: LocalEval[]; getString: GetStringFn }) {
    return (
        <Box>
            {evals.map((e, idx) => {
                const color = getDimColor(e.dimension_key, idx, e.dimension_color);
                const mean = evalMean(e);
                const pct = ((mean ?? 0) / MAX_GRADE) * 100;
                return (
                    <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                        <Typography fontSize={11} fontWeight={600} sx={{ width: 180, flexShrink: 0, color }} noWrap>
                            {competenceName(getString, e.dimension_key, e.dimension_name)}
                        </Typography>
                        <Box sx={{ flex: 1, height: 10, borderRadius: 5, bgcolor: `${color}22`, position: 'relative' }}>
                            <Box sx={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: `${pct}%`, borderRadius: 5, bgcolor: color,
                                transition: 'width 0.4s ease',
                            }} />
                        </Box>
                        <Typography fontSize={11} fontWeight={700} sx={{ width: 40, textAlign: 'right', color }}>
                            {mean != null ? mean.toFixed(2) : '—'}/{MAX_GRADE}
                        </Typography>
                    </Box>
                );
            })}
        </Box>
    );
}
