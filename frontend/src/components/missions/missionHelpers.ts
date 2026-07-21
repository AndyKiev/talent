// src/components/missions/missionHelpers.ts
import dayjs from 'dayjs';
import { DATE_FORMAT } from '../../utils/eNums';

/**
 * A mission whose period has ended. Compared at DAY granularity so a mission
 * ending today still counts as running for the whole day.
 */
export function isMissionExpired(endDate: string): boolean {
    return dayjs(endDate).isBefore(dayjs(), 'day');
}

/** ISO 'YYYY-MM-DD' → 'DD.MM.YYYY'. Empty input renders as an em dash. */
export function formatMissionDate(iso: string | null | undefined): string {
    return iso ? dayjs(iso).format(DATE_FORMAT) : '—';
}

/**
 * The end date the server WILL compute, shown read-only in the form while the
 * user spins the duration wheel. The server recomputes and stays authoritative;
 * this is a preview, never a submitted value.
 */
export function previewEndDate(startDate: string | null, durationMonths: number): string {
    if (!startDate || !durationMonths) return '—';
    return dayjs(startDate).add(durationMonths, 'month').format(DATE_FORMAT);
}

/** 'DD.MM.YYYY - DD.MM.YYYY' for the list rows. */
export function formatMissionPeriod(startDate: string, endDate: string): string {
    return `${formatMissionDate(startDate)} - ${formatMissionDate(endDate)}`;
}

/**
 * Mean fulfilment across a mission's KPIs, rounded. A mission always has at
 * least one KPI (service-enforced), but guard anyway so a stale cache can never
 * divide by zero.
 */
export function missionProgress(kpis: { percent: number }[]): number {
    if (!kpis.length) return 0;
    return Math.round(kpis.reduce((sum, k) => sum + k.percent, 0) / kpis.length);
}

/**
 * Whole months in a mission's period. Duration is no longer stored — the server
 * sends it back-calculated, but computing it here too keeps the form's wheel
 * working while the user edits dates before saving.
 */
export function monthsBetween(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0;
    const start = dayjs(startDate);
    let months = dayjs(endDate).diff(start, 'month');
    // diff() truncates; a clamped end date (31 Jan + 1m -> 28 Feb) must still
    // round-trip to the duration that produced it.
    if (months > 0 && start.add(months, 'month').isAfter(dayjs(endDate))) months -= 1;
    return Math.max(0, months);
}
