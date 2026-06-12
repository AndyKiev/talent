import dayjs from 'dayjs';
import { DATE_FORMAT } from './eNums';

/** Render an ISO date string in the app-wide display format, or '—' when empty. */
export const formatDate = (iso: string | null): string =>
    iso ? dayjs(iso).format(DATE_FORMAT) : '—';
