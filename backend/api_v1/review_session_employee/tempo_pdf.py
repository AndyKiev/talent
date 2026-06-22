"""TEMPO Managers evaluation album (single landscape-A4 page).

Reproduces the layout of the "ТЕМРО Менеджери" sheet in the project's reference
workbook: identity header + photo, a competence bar chart, strengths /
development-directions, results, IDP missions, training and feedback.

Pure rendering: takes a plain dict (no DB, no ORM) and returns PDF **or** PNG
bytes from the SAME figure, so the frontend can show the PNG inline (browsers
always render images, unlike an application/pdf iframe which many download) and
offer the PDF as a download. Reused as-is by the future presentation mode.

Each region is drawn into its own clipped Axes (`clip_on=True`), so long fields
stay inside their card instead of overflowing into neighbours. Uses the
matplotlib OO API + Agg backend (no global pyplot state, safe under concurrency)
and DejaVu Sans (ships with matplotlib, covers Cyrillic).
"""

from __future__ import annotations

import datetime as dt
from io import BytesIO
from typing import Optional

import matplotlib

matplotlib.use("Agg")
from matplotlib.figure import Figure
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.patches import FancyBboxPatch, Rectangle

INK = "#1b2a4a"
ACCENT = "#e4572e"
TEAL = "#17a2b8"
GREEN = "#2bae66"
MUTED = "#8a93a6"
PAPER = "#f7f6f2"
PANEL = "#ffffff"
BORDER = "#d8dbe2"

A4_LANDSCAPE = (11.69, 8.27)
FONT = "DejaVu Sans"


# --- low-level helpers ------------------------------------------------------

def _card(fig, x, y, w, h):
    fig.patches.append(
        FancyBboxPatch(
            (x, y), w, h, transform=fig.transFigure,
            boxstyle="round,pad=0.0,rounding_size=0.008",
            linewidth=0.8, edgecolor=BORDER, facecolor=PANEL, zorder=0,
            mutation_aspect=A4_LANDSCAPE[0] / A4_LANDSCAPE[1],
        )
    )


def _lift(ax):
    """Raise an axes above the zorder-0 card patches and make its own background
    transparent, so a chart drawn over a _card isn't painted over by it (the card
    is opaque white). Mirrors the reference sample's lift()."""
    ax.set_zorder(2)
    ax.patch.set_alpha(0)
    return ax


def _text(fig, x, y, s, size, color=INK, weight="normal", va="top"):
    """All body/label text uses fig.text (default zorder 3 → above cards)."""
    fig.text(x, y, s, fontsize=size, color=color, fontweight=weight, va=va,
             ha="left", fontfamily=FONT, zorder=4)


def _field(fig, x, y, label, value, val_w_chars=34):
    """Label above a single-line value (identity grid). Value clamped so a long
    field can't bleed into the neighbouring column."""
    _text(fig, x, y, label, 7.5, MUTED, va="top")
    _text(fig, x, y - 0.022, _shorten(value, val_w_chars) if value else "—",
          10.0, INK, va="top")


def _titled(fig, x, y, w, title, body, title_color=ACCENT, body_size=8.0,
            body_lines=10):
    """Title bar + word-wrapped body, wrapped to ~the column width and clamped to
    a max number of lines so it stays inside its card."""
    _text(fig, x, y, title, 9, title_color, weight="bold", va="top")
    text = "—" if not body else str(body)
    wrapped = _wrap(text, width_chars=int(w * 165))
    wrapped = _clamp_lines(wrapped, body_lines)
    fig.text(x, y - 0.026, wrapped, fontsize=body_size, color=INK, va="top",
             ha="left", fontfamily=FONT, linespacing=1.4, zorder=4)


def _idp_block(fig, x, y, w, missions, title, body_lines=8, body_size=8.0):
    """IDP missions: numbered text plus a colored competence-to-develop tag per
    mission (same coloring the page/HTML uses). Manual line layout so each
    mission's linked competence name can be drawn in its own color."""
    _text(fig, x, y, title, 9, ACCENT, weight="bold", va="top")
    if not missions:
        fig.text(x, y - 0.026, "—", fontsize=body_size, color=INK, va="top",
                 ha="left", fontfamily=FONT, zorder=4)
        return
    line_step = 0.0165
    yc = y - 0.026
    lines_left = body_lines
    width_chars = int(w * 165)
    for i, m in enumerate(missions, start=1):
        if lines_left <= 0:
            fig.text(x, yc, "…", fontsize=body_size, color=INK, va="top",
                     ha="left", fontfamily=FONT, zorder=4)
            break
        text = m.get("text") if isinstance(m, dict) else str(m)
        for ln in _wrap(f"{i}. {text}", width_chars=width_chars).split("\n"):
            if lines_left <= 0:
                break
            fig.text(x, yc, ln, fontsize=body_size, color=INK, va="top",
                     ha="left", fontfamily=FONT, zorder=4)
            yc -= line_step
            lines_left -= 1
        name = m.get("name") if isinstance(m, dict) else None
        color = m.get("color") if isinstance(m, dict) else None
        if name and lines_left > 0:
            fig.text(x + 0.006, yc, f"→ {name}", fontsize=body_size - 0.5,
                     color=color or ACCENT, va="top", ha="left",
                     fontfamily=FONT, fontweight="bold", zorder=4)
            yc -= line_step
            lines_left -= 1


def _wrap(text, width_chars):
    import textwrap

    out = []
    for para in str(text).split("\n"):
        if not para.strip():
            out.append("")
            continue
        out.extend(textwrap.wrap(para, width=max(20, width_chars)) or [""])
    return "\n".join(out)


def _shorten(s, n):
    s = str(s)
    return s if len(s) <= n else s[: n - 1] + "…"


def _clamp_lines(text, max_lines):
    lines = str(text).split("\n")
    if len(lines) <= max_lines:
        return text
    return "\n".join(lines[:max_lines] + ["…"])


# --- page chrome ------------------------------------------------------------

def _header(fig, title):
    fig.patches.append(Rectangle((0, 0.945), 1, 0.055, transform=fig.transFigure,
                                 facecolor=INK, zorder=5, linewidth=0))
    fig.patches.append(Rectangle((0, 0.943), 1, 0.003, transform=fig.transFigure,
                                 facecolor=ACCENT, zorder=6, linewidth=0))
    fig.text(0.035, 0.9725, title, color="white", fontsize=15, fontweight="bold",
             va="center", fontfamily=FONT, zorder=7)
    fig.text(0.965, 0.9725, "TEMPO", color="#aeb7cc", fontsize=11,
             fontweight="bold", ha="right", va="center", fontfamily=FONT, zorder=7)
    fig.text(0.035, 0.02, f"{dt.date.today():%d.%m.%Y}", color=MUTED, fontsize=7.5,
             fontfamily=FONT)


def _photo(fig, x, y, w, h, photo_bytes):
    _card(fig, x, y, w, h)
    if photo_bytes:
        try:
            # Pillow decodes JPEG *and* PNG (matplotlib's imread is PNG-only), and
            # imshow accepts a PIL image directly.
            from PIL import Image

            img = Image.open(BytesIO(photo_bytes))
            ax = _lift(fig.add_axes([x + 0.005, y + 0.008, w - 0.01, h - 0.016]))
            ax.imshow(img)
            ax.axis("off")
            return
        except Exception:
            pass
    fig.text(x + w / 2, y + h / 2, "ФОТО", color=MUTED, fontsize=9,
             ha="center", va="center", fontfamily=FONT)


def _competence_chart(fig, x, y, w, h, competences, max_grade, title):
    """Horizontal bar chart of competence scores (mirrors the frontend bars)."""
    _card(fig, x, y, w, h)
    fig.text(x + 0.012, y + h - 0.018, title, color=INK,
             fontsize=9, fontweight="bold", va="top", fontfamily=FONT, zorder=2)
    if not competences:
        fig.text(x + w / 2, y + h / 2, "—", color=MUTED, fontsize=10,
                 ha="center", va="center", fontfamily=FONT)
        return
    # Generous left margin so the (wrapped) competence names sit inside the card.
    ax = _lift(fig.add_axes([x + 0.105, y + 0.02, w - 0.12, h - 0.07]))
    names = ["\n".join(_wrap(c[0], 16).split("\n")[:2]) for c in competences]
    scores = [c[1] for c in competences]
    # Per-competence color comes from the DB (3rd tuple slot); fall back to a
    # cycled palette for any legacy 2-tuple input.
    fallback = [ACCENT, TEAL, GREEN, "#f3a712", "#7b4dbb"]
    bar_colors = [
        c[2] if len(c) > 2 and c[2] else fallback[i % len(fallback)]
        for i, c in enumerate(competences)
    ]
    ypos = range(len(scores))
    ax.barh(list(ypos), scores, color=bar_colors, height=0.6, zorder=3)
    for i, s in enumerate(scores):
        # Fractional competence level (mean of behaviours) — show as-is, 2 dp.
        label = f"{s:.2f}" if isinstance(s, float) and s % 1 else f"{s:g}"
        ax.text(s + 0.06, i, label, va="center", ha="left", fontsize=7.5,
                color=INK, fontfamily=FONT)
    ax.set_xlim(0, max_grade)
    ax.set_yticks(list(ypos))
    ax.set_yticklabels(names, fontsize=7.5, fontfamily=FONT, color=INK)
    ax.invert_yaxis()
    ax.set_xticks(range(0, max_grade + 1))
    ax.tick_params(length=0, labelsize=7, colors=MUTED)
    for sp in ("top", "right", "left"):
        ax.spines[sp].set_visible(False)
    ax.spines["bottom"].set_color(BORDER)
    ax.grid(axis="x", color="#eceef3", linewidth=0.8)
    ax.set_axisbelow(True)


# --- figure assembly --------------------------------------------------------

def _new_page() -> Figure:
    fig = Figure(figsize=A4_LANDSCAPE, facecolor=PAPER)
    fig.patches.append(Rectangle((0, 0), 1, 1, transform=fig.transFigure,
                                 facecolor=PAPER, zorder=-10, linewidth=0))
    return fig


def _build_page1(data: dict) -> Figure:
    fig = _new_page()
    L = data.get("labels", {})
    g = data.get

    # Header shows the employee's name (no separate ПІБ field on the sheet).
    _header(fig, g("full_name") or "—")

    # Identity: photo + a 2-column field grid (on bare paper, no card behind).
    # Compacted to the top band so the text cards below get the bulk of the page.
    _photo(fig, 0.025, 0.70, 0.11, 0.205, g("photo"))

    col1_x, col2_x = 0.15, 0.37
    proposed = g("proposed_level")
    if proposed and g("proposed_level_status"):
        proposed = f"{proposed} ({g('proposed_level_status')})"
    rows = [
        (L.get("birth_age"), _join(g("birth_date"), g("age"), " · "),
         L.get("marital_children"), _join(g("marital_status"), g("children"), " · ")),
        (L.get("position"), g("position"), L.get("languages"), g("lang_level")),
        (L.get("education"), g("education"), L.get("tenure"), g("tenure")),
        (L.get("current_level"), g("current_level"),
         L.get("proposed_level"), proposed),
    ]
    ry = 0.88
    for l1, v1, l2, v2 in rows:
        _field(fig, col1_x, ry, l1, v1, val_w_chars=30)
        _field(fig, col2_x, ry, l2, v2, val_w_chars=30)
        ry -= 0.052

    # Talent status/period progression — a wider single row beneath the grid.
    _field(fig, col1_x, ry, L.get("talent_status_period"), g("talent_levels"),
           val_w_chars=46)

    # Competence bar chart (top-right).
    _competence_chart(fig, 0.61, 0.66, 0.365, 0.265,
                      g("competences") or [], g("max_grade") or 4,
                      L.get("competence_level", "—"))

    # --- lower grid: 3 tall columns (most of the page, max room for text) ------
    cols = [0.025, 0.343, 0.661]
    cw = 0.31
    # Cards start lower (top 0.60, not 0.64) so the talent status/period row
    # added above them has clear space and no longer overlaps the cards.
    for cx in cols:
        _card(fig, cx, 0.04, cw, 0.56)
    iw = cw - 0.026  # inner text width

    # Column 1: results + what wasn't achieved.
    _titled(fig, cols[0] + 0.013, 0.58, iw,
            L.get("results"), g("results_achievements"), INK, 8, body_lines=14)
    _titled(fig, cols[0] + 0.013, 0.32, iw,
            L.get("not_achieved"), g("not_achieved"), INK, 8, body_lines=12)

    # Column 2: strengths + development directions + IDP missions.
    _titled(fig, cols[1] + 0.013, 0.58, iw,
            L.get("strengths"), g("strengths"), ACCENT, 8, body_lines=8)
    _titled(fig, cols[1] + 0.013, 0.42, iw,
            L.get("development"), g("development_directions"), ACCENT, 8,
            body_lines=8)
    idp = g("idp_missions") or []
    _idp_block(fig, cols[1] + 0.013, 0.22, iw, idp, L.get("idp"), body_lines=8)

    # Column 3: training + employee feedback + manager feedback.
    _titled(fig, cols[2] + 0.013, 0.58, iw,
            L.get("training"), g("training_done"), INK, 8, body_lines=8)
    _titled(fig, cols[2] + 0.013, 0.42, iw,
            L.get("employee_feedback"), g("employee_feedback"), INK, 8,
            body_lines=8)
    _titled(fig, cols[2] + 0.013, 0.22, iw,
            L.get("manager_feedback"), g("manager_feedback"), INK, 8,
            body_lines=8)

    return fig


def _build_page2(data: dict) -> Optional[Figure]:
    """Second sheet: the proposed level's requirements, each with the employee's
    facts beneath. Built whenever a level registration exists — no status filter
    (once the record is there, the page is there)."""
    reqs = data.get("level_requirements") or []
    if not data.get("has_level_registration") and not reqs:
        return None

    fig = _new_page()
    L = data.get("labels", {})
    proposed = data.get("proposed_level")
    title = L.get("level_requirements", "Level requirements")
    if proposed:
        title = f"{title}: {proposed}"
    _header(fig, title)

    # Level sense (confirm / increase / decrease) just under the header band.
    sense = data.get("proposed_level_sense")
    if sense:
        _text(fig, 0.025, 0.935, sense, 9.5, ACCENT, weight="bold", va="top")

    # Two columns of requirement cards so a long list fits one page.
    cols_x = [0.025, 0.515]
    col_w = 0.46
    wrap_chars = int(col_w * 150)  # wrap width that stays inside one column
    top, bottom = 0.90, 0.05
    per_col = max((len(reqs) + 1) // 2, 1) if reqs else 1
    for i, req in enumerate(reqs):
        col = 0 if i < per_col else 1
        idx_in_col = i if col == 0 else i - per_col
        cell_h = (top - bottom) / per_col
        y = top - (idx_in_col + 1) * cell_h
        x = cols_x[col]
        _card(fig, x, y + 0.006, col_w, cell_h - 0.012)
        # Wrap the requirement title so a long one can't bleed into the other
        # column (the previous single-line _text caused the overlap).
        title_txt = f"{i + 1}. {req.get('text') or '—'}"
        title_wrapped = _clamp_lines(_wrap(title_txt, wrap_chars), 3)
        n_title_lines = title_wrapped.count("\n") + 1
        title_y = y + cell_h - 0.02
        fig.text(x + 0.012, title_y, title_wrapped, fontsize=8.5, color=INK,
                 fontweight="bold", va="top", ha="left", fontfamily=FONT,
                 linespacing=1.25, zorder=4)
        facts = req.get("facts") or "—"
        facts_y = title_y - n_title_lines * 0.020 - 0.006
        avail = facts_y - (y + 0.012)
        max_lines = max(2, int(avail / 0.019))
        wrapped = _clamp_lines(_wrap(facts, wrap_chars), max_lines)
        fig.text(x + 0.012, facts_y, wrapped, fontsize=7.5, color=INK,
                 va="top", ha="left", fontfamily=FONT, linespacing=1.3, zorder=4)

    if not reqs:
        fig.text(0.5, 0.5, "—", color=MUTED, fontsize=12, ha="center",
                 va="center", fontfamily=FONT)
    return fig


def _pages(data: dict) -> list[Figure]:
    pages = [_build_page1(data)]
    p2 = _build_page2(data)
    if p2 is not None:
        pages.append(p2)
    return pages


# --- public API -------------------------------------------------------------

def build_tempo_pdf(data: dict) -> bytes:
    buf = BytesIO()
    with PdfPages(buf) as pdf:
        for fig in _pages(data):
            pdf.savefig(fig)
    buf.seek(0)
    return buf.read()


def render_tempo_png(data: dict, dpi: int = 150) -> bytes:
    """All pages stacked into ONE tall PNG, so the inline viewer shows every page
    in a single scrollable <img> (browsers render images inline; an
    application/pdf iframe is downloaded in many of them)."""
    from PIL import Image

    imgs = []
    for fig in _pages(data):
        b = BytesIO()
        fig.savefig(b, format="png", dpi=dpi)
        b.seek(0)
        imgs.append(Image.open(b).convert("RGB"))

    if len(imgs) == 1:
        out = BytesIO()
        imgs[0].save(out, format="PNG")
        return out.getvalue()

    width = max(im.width for im in imgs)
    gap = 16
    height = sum(im.height for im in imgs) + gap * (len(imgs) - 1)
    canvas = Image.new("RGB", (width, height), (231, 233, 239))
    y = 0
    for im in imgs:
        canvas.paste(im, (0, y))
        y += im.height + gap
    out = BytesIO()
    canvas.save(out, format="PNG")
    return out.getvalue()


def _join(a, b, sep) -> Optional[str]:
    parts = [str(x) for x in (a, b) if x not in (None, "")]
    return sep.join(parts) if parts else None
