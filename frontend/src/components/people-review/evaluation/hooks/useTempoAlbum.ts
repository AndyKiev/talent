import { useState } from 'react';
import type { GetStringFn } from '../../../../types/getStringFn';
import {
    fetchTempoPngUrl,
    downloadTempoPdf,
    fetchTempoHtmlUrl,
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
    // A finished album the popup blocker would not let us open automatically —
    // held so the user can open it with a fresh click instead of rebuilding.
    const [readyHtmlUrl, setReadyHtmlUrl] = useState<string | null>(null);

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
    //
    // BUILD FIRST, switch after. The previous version opened a blank tab up front
    // (the popup-blocker-safe trick) and filled it when the build finished, which
    // dumped the user on an empty white page for the many seconds the server
    // takes. Now the wait happens HERE, behind the busy overlay on the page they
    // are already reading, and the tab appears only once the document exists.
    //
    // The trade-off is that `window.open` after an await is outside the click
    // gesture, so a blocker may refuse it. That is why the URL is kept in
    // `readyHtmlUrl`: the UI then offers one more click, which IS a gesture and
    // always works. Nothing is lost either way — the build is already done.
    const openTempoHtmlView = async () => {
        setBusyLabel(getString('tempoPresentationBuilding'));
        try {
            const url = await fetchTempoHtmlUrl(rid);
            const win = window.open(url, '_blank');
            if (win) {
                // Revoke only after the new tab has had time to load it.
                setTimeout(() => URL.revokeObjectURL(url), 60_000);
            } else {
                setReadyHtmlUrl(url);
            }
        } catch (err) {
            onError((err as Error).message);
        } finally {
            setBusyLabel(null);
        }
    };

    /** Second-chance open for a build the popup blocker refused. */
    const openReadyHtml = () => {
        if (!readyHtmlUrl) return;
        window.open(readyHtmlUrl, '_blank');
        const url = readyHtmlUrl;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setReadyHtmlUrl(null);
    };

    const dismissReadyHtml = () => {
        if (readyHtmlUrl) URL.revokeObjectURL(readyHtmlUrl);
        setReadyHtmlUrl(null);
    };

    return {
        pdfOpen, pdfUrl, pdfLoading, pdfError, busyLabel,
        openTempoPdf, closeTempoPdf, downloadTempo, openTempoHtmlView,
        readyHtmlUrl, openReadyHtml, dismissReadyHtml,
    };
}
