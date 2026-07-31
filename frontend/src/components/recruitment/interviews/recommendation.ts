import type { GetStringFn } from '../../../types/getStringFn';
import type { Recommendation } from './recruitmentInterviewApi';

export const RECOMMENDATION_COLOR: Record<Recommendation, 'success' | 'error' | 'warning'> = {
    hire: 'success',
    no_hire: 'error',
    maybe: 'warning',
};

const LABEL_KEY: Record<Recommendation, string> = {
    hire: 'recHire',
    no_hire: 'recNoHire',
    maybe: 'recMaybe',
};

const FALLBACK: Record<Recommendation, string> = {
    hire: 'Hire',
    no_hire: 'No hire',
    maybe: 'Maybe',
};

export function recommendationLabel(rec: Recommendation, getString: GetStringFn): string {
    return getString(LABEL_KEY[rec]) || FALLBACK[rec];
}
