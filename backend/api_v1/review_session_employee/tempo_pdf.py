"""TEMPO Managers evaluation album (landscape-A4, paginated).

Reproduces the layout of the "ТЕМРО Менеджери" sheet in the project's reference
workbook: identity header + photo, a competence bar chart, then the evaluation
sections (results, not-achieved, development plan, strengths, to-develop,
trainings, feedbacks) and the proposed level's requirements with full facts.

Pure rendering: takes a plain dict (no DB, no ORM) and returns PDF **or** PNG
bytes from the SAME figures, so the frontend can show the PNG inline (browsers
always render images, unlike an application/pdf iframe which many download) and
offer the PDF as a download. Reused as-is by the presentation mode.

Layout is a small FLOW engine (see the "flow layout engine" section): every
section is measured (line heights are analytic) and packed into three columns;
a block that doesn't fit is SPLIT at a line boundary and continued on the next
page, so text is NEVER truncated — the album grows to as many pages as needed.
Uses the matplotlib OO API + Agg backend (no global pyplot state, safe under
concurrency) and DejaVu Sans (ships with matplotlib, covers Cyrillic).
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
            (x, y),
            w,
            h,
            transform=fig.transFigure,
            boxstyle="round,pad=0.0,rounding_size=0.008",
            linewidth=0.8,
            edgecolor=BORDER,
            facecolor=PANEL,
            zorder=0,
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
    fig.text(
        x,
        y,
        s,
        fontsize=size,
        color=color,
        fontweight=weight,
        va=va,
        ha="left",
        fontfamily=FONT,
        zorder=4,
    )


def _field(fig, x, y, label, value, wrap_chars=26, max_lines=None):
    """Label above a value (identity grid). The value WRAPS to the column width so
    long fields (job, education) are shown IN FULL — never truncated with "…".
    `max_lines` clamps only if given (used for the single-line talent row).
    Returns the number of value lines drawn so the caller can space the next row
    below a wrapped value."""
    _text(fig, x, y, label, 7.5, MUTED, va="top")
    text = _wrap(value, wrap_chars) if value else "—"
    if max_lines is not None:
        text = _clamp_lines(text, max_lines)
    fig.text(
        x,
        y - 0.020,
        text,
        fontsize=8.5,
        color=INK,
        va="top",
        ha="left",
        fontfamily=FONT,
        linespacing=1.2,
        zorder=4,
    )
    return text.count("\n") + 1


def _wrap(text, width_chars):
    import textwrap

    out = []
    for para in str(text).split("\n"):
        if not para.strip():
            out.append("")
            continue
        out.extend(textwrap.wrap(para, width=max(20, width_chars)) or [""])
    return "\n".join(out)


def _clamp_lines(text, max_lines):
    lines = str(text).split("\n")
    if len(lines) <= max_lines:
        return text
    return "\n".join(lines[:max_lines] + ["…"])


# --- flow layout engine -----------------------------------------------------
# Sections are flowed (measured, then packed into columns / extra pages) so the
# album NEVER truncates text. Height is analytic: a line of `size`-pt text at
# `linespacing` occupies `size * linespacing / (page_height_in * 72)` of the
# figure. The page is A4 landscape (8.27in tall), so one body line ≈ 0.0188.

PAGE_H_IN = A4_LANDSCAPE[1]


def _line_frac(size, linespacing=1.4):
    """Figure-fraction height of a single line of text at the given point size."""
    return size * linespacing / (PAGE_H_IN * 72)


def _wrap_lines(text, width_chars):
    """Wrapped text as a list of lines (empty list -> a single '—' placeholder)."""
    return _wrap(text or "—", width_chars).split("\n")


class _Line:
    """One drawable line of text with its own metrics, so a block is just a list
    of these. `keep_with_next` marks a title line that must not be left dangling
    at the foot of a column (it stays with the body line that follows it)."""

    __slots__ = ("text", "size", "color", "weight", "indent", "ls", "keep_with_next")

    def __init__(
        self,
        text,
        size,
        color=INK,
        weight="normal",
        indent=0.0,
        ls=1.4,
        keep_with_next=False,
    ):
        self.text = text
        self.size = size
        self.color = color
        self.weight = weight
        self.indent = indent
        self.ls = ls
        self.keep_with_next = keep_with_next

    @property
    def h(self):
        return _line_frac(self.size, self.ls)


class _Block:
    """A pre-measured section = an ordered list of `_Line`s. Because it is just
    lines, an over-long block can be SPLIT at a line boundary: the lines that fit
    are drawn now and the remainder becomes a continuation block on the next page,
    so text is never clamped or pushed off the page.

    `header_lines` (the block's group title, e.g. "План розвитку") are REPEATED at
    the top of every continuation block, so a split group keeps its context on the
    next page. They are stored separately from `lines` so they aren't re-split."""

    GAP = 0.02  # vertical gap below a block before the next one

    def __init__(self, lines, header_lines=None):
        self.lines = lines
        self.header_lines = header_lines or []

    @property
    def height(self):
        return sum(ln.h for ln in self.header_lines) + sum(ln.h for ln in self.lines)

    def _make(self, body_lines):
        return _Block(body_lines, header_lines=self.header_lines)

    def split(self, avail):
        """Return (head, tail): `head` holds the repeated header + as many leading
        body lines as fit in `avail` (keeping a title-run glued to its first body
        line); `tail` repeats the header then continues the rest. If not even the
        header + first unit fits, head is None so the caller moves it to a fresh
        page. Never drops a line."""
        header_h = sum(ln.h for ln in self.header_lines)
        used = header_h
        cut = 0  # number of body lines committed to the head
        n = len(self.lines)
        while cut < n:
            # The next indivisible unit = a run of keep_with_next lines plus the
            # one line after it (so a title never sits alone at a column foot).
            j = cut
            run = 0.0
            while j < n and self.lines[j].keep_with_next:
                run += self.lines[j].h
                j += 1
            if j < n:
                run += self.lines[j].h
                j += 1
            if used + run <= avail:
                used += run
                cut = j
            else:
                break
        if cut >= n:
            return self, None
        if cut == 0:
            return None, self
        return self._make(self.lines[:cut]), self._make(self.lines[cut:])

    def draw(self, fig, x, top, w):
        y = top
        for ln in list(self.header_lines) + list(self.lines):
            fig.text(
                x + ln.indent,
                y,
                ln.text,
                fontsize=ln.size,
                color=ln.color,
                fontweight=ln.weight,
                va="top",
                ha="left",
                fontfamily=FONT,
                zorder=4,
            )
            y -= ln.h


def _heading_lines(title, color, size=9):
    """A group-title heading + a thin gap, used as a block's repeatable header."""
    return [_Line(title, size, color, "bold", ls=1.2), _Line("", 4)]


def _titled_block(title, body, width_chars, color=INK):
    """Bold title + full word-wrapped body (results, feedback, etc.). The title is
    a repeatable header so it reappears if the body flows to the next page."""
    lines = [_Line(ln, 8) for ln in _wrap_lines(body, width_chars)]
    return _Block(lines, header_lines=_heading_lines(title, color))


def _idp_block(title, missions, width_chars, kpi_label=None):
    """IDP missions: numbered text + its KPI + a colored competence tag per mission."""
    body = []
    for i, m in enumerate(missions or [], start=1):
        text = m.get("text") if isinstance(m, dict) else str(m)
        for ln in _wrap_lines(f"{i}. {text}", width_chars):
            body.append(_Line(ln, 8))
        kpi = m.get("kpi") if isinstance(m, dict) else None
        if kpi:
            label = f"{kpi_label}: " if kpi_label else "KPI: "
            for j, ln in enumerate(_wrap_lines(f"{label}{kpi}", width_chars)):
                body.append(_Line(ln, 7.5, MUTED, indent=0.006))
        name = m.get("name") if isinstance(m, dict) else None
        color = m.get("color") if isinstance(m, dict) else None
        if name:
            body.append(_Line(f"→ {name}", 7.5, color or ACCENT, "bold", indent=0.006))
    if not body:
        body.append(_Line("—", 8))
    return _Block(body, header_lines=_heading_lines(title, ACCENT))


def _competence_summary_block(title, items, width_chars):
    """Strong / to-develop summary: each picked competence as a bold, DB-colored
    name followed by its comments as bullets (mirrors the HTML album). Named even
    when it has no comments, so a picked competence is never invisible."""
    body = []
    for it in items or []:
        name = (it.get("name") if isinstance(it, dict) else None) or "—"
        color = (it.get("color") if isinstance(it, dict) else None) or ACCENT
        name_lines = _wrap_lines(name, width_chars)
        for k, ln in enumerate(name_lines):
            # Keep the competence name glued to its first comment line.
            body.append(_Line(ln, 8, color, "bold", keep_with_next=True))
        comments = it.get("comments") if isinstance(it, dict) else None
        for c in comments or []:
            if str(c).strip():
                for ln in _wrap_lines(f"• {c}", width_chars):
                    body.append(_Line(ln, 7.5, indent=0.006))
        body.append(_Line("", 4))
    if not body:
        body.append(_Line("—", 8))
    return _Block(body, header_lines=_heading_lines(title, ACCENT))


def _req_block(n, text, facts, width_chars):
    """A requirement: bold numbered title (repeated on continuation) + the
    employee's FULL facts beneath."""
    header = [
        _Line(ln, 8.5, INK, "bold", ls=1.25)
        for ln in _wrap_lines(f"{n}. {text or '—'}", width_chars)
    ]
    header.append(_Line("", 3))
    body = [_Line(ln, 7.5, ls=1.3) for ln in _wrap_lines(facts, width_chars)]
    return _Block(body, header_lines=header)


def _pack_one_page(columns, col_xs, top, bottom, pad=0.013):
    """Place each column's blocks down from `top`. A block that doesn't fit is
    SPLIT at a line boundary: the part that fits is drawn and the remainder is put
    back at the head of the column to continue on the next page — so nothing ever
    overruns the bottom margin or gets clamped. Mutates `columns`.

    Returns (placements, col_bottoms): placements = (block, ci, x, block_top);
    col_bottoms[ci] = lowest y the column reached (for sizing its card)."""
    placements = []
    col_bottoms = []
    for ci, blocks in enumerate(columns):
        y = top
        while blocks:
            blk = blocks[0]
            avail = (y - pad) - bottom
            if blk.height <= avail:
                placements.append((blk, ci, col_xs[ci] + pad, y - pad))
                y -= pad + blk.height + blk.GAP
                blocks.pop(0)
                continue
            head, tail = blk.split(avail)
            if head is None:
                # Nothing fits in the space left; if the column is fresh this
                # block is taller than a whole page — force the head that fits a
                # FULL page so we still make progress, else move to next page.
                if abs(y - top) < 1e-9:
                    head, tail = blk.split(top - bottom - pad)
                    if head is None:  # single line taller than a page (never)
                        head, tail = blk, None
                else:
                    break
            placements.append((head, ci, col_xs[ci] + pad, y - pad))
            y -= pad + head.height
            if tail is None:
                blocks.pop(0)
            else:
                blocks[0] = tail  # remainder continues on the next page
            break  # column is full once a block had to be split
        col_bottoms.append(min(y, top))
    return placements, col_bottoms


# --- page chrome ------------------------------------------------------------


def _header(fig, title):
    fig.patches.append(
        Rectangle(
            (0, 0.945),
            1,
            0.055,
            transform=fig.transFigure,
            facecolor=INK,
            zorder=5,
            linewidth=0,
        )
    )
    fig.patches.append(
        Rectangle(
            (0, 0.943),
            1,
            0.003,
            transform=fig.transFigure,
            facecolor=ACCENT,
            zorder=6,
            linewidth=0,
        )
    )
    fig.text(
        0.035,
        0.9725,
        title,
        color="white",
        fontsize=15,
        fontweight="bold",
        va="center",
        fontfamily=FONT,
        zorder=7,
    )
    fig.text(
        0.965,
        0.9725,
        "TEMPO",
        color="#aeb7cc",
        fontsize=11,
        fontweight="bold",
        ha="right",
        va="center",
        fontfamily=FONT,
        zorder=7,
    )
    fig.text(
        0.035,
        0.02,
        f"{dt.date.today():%d.%m.%Y}",
        color=MUTED,
        fontsize=7.5,
        fontfamily=FONT,
    )


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
    fig.text(
        x + w / 2,
        y + h / 2,
        "ФОТО",
        color=MUTED,
        fontsize=9,
        ha="center",
        va="center",
        fontfamily=FONT,
    )


def _competence_chart(fig, x, y, w, h, competences, max_grade, title):
    """Horizontal bar chart of competence scores (mirrors the frontend bars)."""
    _card(fig, x, y, w, h)
    fig.text(
        x + 0.012,
        y + h - 0.018,
        title,
        color=INK,
        fontsize=9,
        fontweight="bold",
        va="top",
        fontfamily=FONT,
        zorder=2,
    )
    if not competences:
        fig.text(
            x + w / 2,
            y + h / 2,
            "—",
            color=MUTED,
            fontsize=10,
            ha="center",
            va="center",
            fontfamily=FONT,
        )
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
        # Competence level is a MEAN of behaviours — always show 2 decimals so it
        # never reads as a rounded whole grade (3.00, not 3).
        label = f"{float(s):.2f}"
        ax.text(
            s + 0.06,
            i,
            label,
            va="center",
            ha="left",
            fontsize=7.5,
            color=INK,
            fontfamily=FONT,
        )
    ax.set_xlim(0, max_grade)
    ax.set_yticks(list(ypos))
    ax.set_yticklabels(names, fontsize=7.5, fontfamily=FONT, color=INK)
    ax.invert_yaxis()
    # Half-grade ticks (0, 0.5, 1, …) so the scale reads as fractional — the
    # scores are means of behaviours, not whole grades.
    n_half = max_grade * 2
    ticks = [t / 2 for t in range(n_half + 1)]
    ax.set_xticks(ticks)
    ax.set_xticklabels([f"{t:g}" for t in ticks])
    ax.tick_params(length=0, labelsize=6, colors=MUTED)
    for sp in ("top", "right", "left"):
        ax.spines[sp].set_visible(False)
    ax.spines["bottom"].set_color(BORDER)
    ax.grid(axis="x", color="#eceef3", linewidth=0.8)
    ax.set_axisbelow(True)


# --- figure assembly --------------------------------------------------------


def _new_page() -> Figure:
    fig = Figure(figsize=A4_LANDSCAPE, facecolor=PAPER)
    fig.patches.append(
        Rectangle(
            (0, 0),
            1,
            1,
            transform=fig.transFigure,
            facecolor=PAPER,
            zorder=-10,
            linewidth=0,
        )
    )
    return fig


# Column geometry shared by every flowed page (3 columns across the sheet).
_COLS_X = [0.025, 0.343, 0.661]
_COL_W = 0.31
_COL_INNER_CHARS = int((_COL_W - 0.026) * 165)  # wrap width inside a column
_PAGE_BOTTOM = 0.045


def _identity_band(fig, data) -> float:
    """Header + photo + identity field grid + talent row + competence chart — the
    top band of page 1. Returns the y of the band's BOTTOM so the flowed section
    columns can start just below it (the band grows when job/education wrap, so
    its height — and the column top — are computed, never assumed)."""
    L = data.get("labels", {})
    g = data.get
    _header(fig, g("full_name") or "—")
    _photo(fig, 0.025, 0.70, 0.11, 0.205, g("photo"))

    col1_x, col2_x = 0.15, 0.37
    proposed = g("proposed_level")
    if proposed and g("proposed_level_status"):
        proposed = f"{proposed} ({g('proposed_level_status')})"
    # Marital status and children are separate fields (the joined "married · 4 р."
    # read like a marriage duration); children gets its own labelled cell.
    rows = [
        (
            L.get("birth_age"),
            _join(g("birth_date"), g("age"), " · "),
            L.get("marital_children"),
            g("marital_status"),
        ),
        (L.get("children"), g("children"), L.get("tenure"), g("tenure")),
        (L.get("position"), g("position"), L.get("languages"), g("lang_level")),
        (
            L.get("education"),
            g("education"),
            L.get("current_level"),
            g("current_level"),
        ),
        (L.get("proposed_level"), proposed, None, None),
    ]
    # Variable row height: a row whose value wraps to N lines takes more vertical
    # space, so advance ry by the TALLER of its two fields (label + value lines).
    ry = 0.90
    for l1, v1, l2, v2 in rows:
        n1 = _field(fig, col1_x, ry, l1, v1, wrap_chars=26) if l1 else 1
        n2 = _field(fig, col2_x, ry, l2, v2, wrap_chars=26) if l2 else 1
        ry -= 0.020 + max(n1, n2) * 0.018

    # Talent status/period progression — a wider single row beneath the grid.
    n = _field(
        fig,
        col1_x,
        ry,
        L.get("talent_status_period"),
        g("talent_levels"),
        wrap_chars=110,
    )
    ry -= 0.020 + n * 0.018

    _competence_chart(
        fig,
        0.61,
        0.66,
        0.365,
        0.265,
        g("competences") or [],
        g("max_grade") or 4,
        L.get("competence_level", "—"),
    )
    # The band's bottom is the lower of the field grid and the photo/chart band.
    return min(ry, 0.66) - 0.01


# Top of the flowed section columns: lower on page 1 (under the identity band),
# higher on continuation pages (just the header). Bottom margin is shared.
_BAND_BOTTOM = 0.60
_CONT_TOP = 0.90

# Full-width single column for the requirements list — each requirement's facts
# span the whole page (one comment per full-width block, like the HTML).
_FULL_X = [0.025]
_FULL_W = 0.95
_FULL_INNER_CHARS = int((_FULL_W - 0.026) * 165)


def _page1_columns(data: dict) -> list[list[_Block]]:
    """The eight evaluation sections grouped into the three columns the layout
    uses: col 1 = results / not achieved / development plan (IDP); col 2 =
    strengths / competences-to-develop; col 3 = trainings / feedbacks. Anything
    that overruns a column flows to continuation pages — nothing is truncated."""
    L = data.get("labels", {})
    g = data.get
    c = _COL_INNER_CHARS
    return [
        [
            _titled_block(L.get("results"), g("results_achievements"), c, INK),
            _titled_block(L.get("not_achieved"), g("not_achieved"), c, INK),
            _idp_block(L.get("idp"), g("idp_missions") or [], c, L.get("kpi")),
        ],
        [
            _competence_summary_block(
                L.get("strengths"), g("strengths_items") or [], c
            ),
            _competence_summary_block(
                L.get("development"), g("development_items") or [], c
            ),
        ],
        [
            _titled_block(L.get("training"), g("training_done"), c, INK),
            _titled_block(L.get("employee_feedback"), g("employee_feedback"), c, INK),
            _titled_block(L.get("manager_feedback"), g("manager_feedback"), c, INK),
        ],
    ]


def _req_blocks(data: dict) -> list[_Block]:
    """Each proposed-level requirement as a full-width block: numbered title +
    FULL facts spanning the whole page (one comment per block, like the HTML)."""
    reqs = data.get("level_requirements") or []
    return [
        _req_block(i, r.get("text"), r.get("facts"), _FULL_INNER_CHARS)
        for i, r in enumerate(reqs, start=1)
    ]


def _spread(blocks: list[_Block], n: int) -> list[list[_Block]]:
    """Distribute a flat block list across `n` columns, balancing by measured
    height so continuation pages fill evenly (greedy shortest-column-first)."""
    cols: list[list[_Block]] = [[] for _ in range(n)]
    heights = [0.0] * n
    for blk in blocks:
        i = heights.index(min(heights))
        cols[i].append(blk)
        heights[i] += blk.height + blk.GAP
    return cols


def _draw_flow_page(columns, top, draw_chrome, col_xs, col_w) -> tuple[Figure, bool]:
    """Render ONE page from column-assigned blocks: chrome at the top, a uniform
    full-height card behind each column that holds content, then the blocks.
    `draw_chrome(fig)` may return a float to OVERRIDE the column top (the identity
    band returns its computed bottom so a tall band pushes the columns down).
    Returns (fig, more) — `more` is True if any block did not fit and remains in
    `columns` for the next page. Mutates `columns` (placed blocks are consumed)."""
    fig = _new_page()
    override = draw_chrome(fig)
    if isinstance(override, (int, float)):
        top = override
    placements, _ = _pack_one_page(columns, col_xs, top, _PAGE_BOTTOM)
    used = {ci for _, ci, _, _ in placements}
    # One uniform card per used column (top → page bottom) so columns keep the
    # tidy equal-height grid instead of ragged content-hugging boxes.
    for ci, cx in enumerate(col_xs):
        if ci in used:
            _card(fig, cx, _PAGE_BOTTOM - 0.012, col_w, top - _PAGE_BOTTOM + 0.018)
    for blk, ci, x, btop in placements:
        blk.draw(fig, x, btop, col_w - 0.026)
    more = any(col for col in columns)
    return fig, more


def _render_flow(
    columns, first_top, first_chrome, cont_chrome, col_xs=_COLS_X, col_w=_COL_W
) -> list[Figure]:
    """Flow column-assigned blocks across as many pages as needed. The first page
    draws `first_chrome` (identity band / requirements header) and starts its
    columns at `first_top`; continuation pages draw `cont_chrome` and use the full
    height, re-spreading leftover blocks evenly across the columns. `col_xs`/`col_w`
    pick the geometry — three columns for the sheet, one full-width column for the
    requirement list (each requirement's facts span the whole page)."""
    figs = []
    fig, more = _draw_flow_page(columns, first_top, first_chrome, col_xs, col_w)
    figs.append(fig)
    while more:
        leftover = [blk for col in columns for blk in col]
        columns = _spread(leftover, len(col_xs))
        fig, more = _draw_flow_page(columns, _CONT_TOP, cont_chrome, col_xs, col_w)
        figs.append(fig)
    return figs


def _pages(data: dict) -> list[Figure]:
    name = data.get("full_name") or "—"
    pages = _render_flow(
        _page1_columns(data),
        first_top=_BAND_BOTTOM,
        first_chrome=lambda fig: _identity_band(fig, data),
        cont_chrome=lambda fig: _header(fig, name),
    )

    reqs = _req_blocks(data)
    if data.get("has_level_registration") or reqs:
        L = data.get("labels", {})
        proposed = data.get("proposed_level")
        title = L.get("level_requirements", "Level requirements")
        if proposed:
            title = f"{title}: {proposed}"
        chrome = lambda fig: _header(fig, title)  # noqa: E731
        if not reqs:
            fig = _new_page()
            chrome(fig)
            fig.text(
                0.5,
                0.5,
                "—",
                color=MUTED,
                fontsize=12,
                ha="center",
                va="center",
                fontfamily=FONT,
            )
            pages.append(fig)
        else:
            # Requirements flow in ONE full-width column (each fact spans the
            # page) rather than the 3 narrow columns used for the sheet.
            pages += _render_flow(
                [list(reqs)],
                first_top=_CONT_TOP,
                first_chrome=chrome,
                cont_chrome=chrome,
                col_xs=_FULL_X,
                col_w=_FULL_W,
            )
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
