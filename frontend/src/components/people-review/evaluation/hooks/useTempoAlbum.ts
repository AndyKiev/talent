import { useState } from 'react';
import type { GetStringFn } from '../../../../types/getStringFn';
import {
    fetchTempoPngUrl,
    downloadTempoPdf,
    openTempoHtml,
} from '../../peopleReviewApi';
import type { ReviewSessionEmployee } from '../../peopleReviewApi';

interface Args {
    rid: number;
    rseDetail: ReviewSessionEmployee | undefined;
    getString: GetStringFn;
    onError: (message: string) => void;
}

/**
 * TEMPO album viewer/export state + handlers. The album is fetched as a PNG blob
 * URL (axios sends the JWT; a plain <img src> can't) and shown inline; the PDF is
 * an explicit download and the interactive HTML opens in a new tab. `busyLabel`
 * drives the full-window blocking overlay for the long PDF/HTML builds.
 */
export function useTempoAlbum({ rid, rseDetail, getString, onError }: Args) {
    const [pdfOpen, setPdfOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [busyLabel, setBusyLabel] = useState<string | null>(null);

    const openTempoPdf = async () => {
        setPdfOpen(true);
        setPdfLoading(true);
        setPdfError(null);
        try {
            const url = await fetchTempoPngUrl(rid);
            setPdfUrl(url);
        } catch (err) {
            // Keep the dialog open and show the reason in-place — a silent close
            // looked like "nothing displayed".
            setPdfError((err as Error).message || getString('tempoPdfError'));
        } finally {
            setPdfLoading(false);
        }
    };

    const closeTempoPdf = () => {
        setPdfOpen(false);
        setPdfError(null);
        if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
    };

    const downloadTempo = async () => {
        // Filename = session id + session name + employee code + employee name
        // (sanitized of path/illegal chars), per request — not a hash.
        const sanitize = (s: string) => s.replace(/[/\\:*?"<>|]+/g, '').replace(/\s+/g, '_').trim();
        const parts = [
            rseDetail?.session_id != null ? `s${rseDetail.session_id}` : null,
            rseDetail?.session_name,
            rseDetail?.employee_code,
            rseDetail?.employee_name,
        ].filter(Boolean).map((p) => sanitize(String(p)));
        const fileName = `${parts.join('_') || `tempo_${rid}`}.pdf`;
        setBusyLabel(getString('tempoPdfBuilding'));
        try {
            await downloadTempoPdf(rid, fileName);
        } catch (err) {
            onError((err as Error).message);
        } finally {
            setBusyLabel(null);
        }
    };

    // Open the interactive HTML sheet (single page, in-page links) in a new tab.
    // The tab is opened synchronously on the click so the browser doesn't block it
    // after the build (see openHtmlBlob in peopleReviewApi).
    const openTempoHtmlView = async () => {
        const win = window.open('', '_blank');
        if (!win) {
            onError(getString('popupBlocked'));
            return;
        }
        const building = getString('tempoPresentationBuilding');
        win.document.write(
            `<!doctype html><meta charset="utf-8"><title>TEMPO</title>` +
            `<body style="margin:0;display:flex;align-items:center;justify-content:center;` +
            `height:100vh;font-family:'Segoe UI',Arial,sans-serif;color:#1b2a4a;background:#f7f6f2">` +
            `<div style="font-size:18px;font-weight:600">${building}</div></body>`,
        );
        setBusyLabel(building);
        try {
            await openTempoHtml(rid, win);
        } catch (err) {
            onError((err as Error).message);
        } finally {
            setBusyLabel(null);
        }
    };

    return {
        pdfOpen, pdfUrl, pdfLoading, pdfError, busyLabel,
        openTempoPdf, closeTempoPdf, downloadTempo, openTempoHtmlView,
    };
}
