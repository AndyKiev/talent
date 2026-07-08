"""TEMPO session deck as a PowerPoint file — the same data the HTML presentation
shows (shared `_tempo_data` dicts, no logic drift), arranged like the HTML album
but paginated for 16:9 slides:

* slide 1 — general session statistics (session name, number of employees in the
  deck, period, session departments);
* one slide per employee (identity + competence bars + the section columns);
* a SECOND slide for an employee only when a new level is proposed — it carries
  the proposed-level requirements with the recorded facts.

``build_tempo_pptx(session_info, sheets)`` returns the .pptx bytes. Pure renderer:
all text (labels included) arrives translated in the dicts, no DB access here.
"""

from __future__ import annotations

import io
from typing import Optional

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.util import Emu, Inches, Pt

# Palette — same as the TEMPO HTML album (_CSS in tempo_html.py).
_INK = RGBColor.from_string("1B2A4A")
_ACCENT = RGBColor.from_string("E4572E")
_MUTED = RGBColor.from_string("8A93A6")
_PAPER = RGBColor.from_string("F7F6F2")
_PANEL = RGBColor.from_string("FFFFFF")
_BORDER = RGBColor.from_string("D8DBE2")
_TRACK = RGBColor.from_string("ECEEF3")

_FONT = "Arial"

_SLIDE_W = Inches(13.333)
_SLIDE_H = Inches(7.5)


def _rgb(color: Optional[str]) -> RGBColor:
    """'#1565C0' (DB dimension color) -> RGBColor; ink on anything malformed."""
    try:
        return RGBColor.from_string(str(color).lstrip("#"))
    except (ValueError, TypeError):
        return _INK


def _fmt_value(v) -> str:
    """Competence level is a MEAN of behaviours — always 2 decimals (same rule
    as the HTML album) so it never reads as a rounded whole grade."""
    try:
        return f"{float(v):.2f}"
    except (TypeError, ValueError):
        return "—"


def _fill(shape, color: RGBColor, line: Optional[RGBColor] = None):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line
        shape.line.width = Pt(0.75)
    shape.shadow.inherit = False


def _textbox(slide, x, y, w, h):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    return box, tf


def _set_run(run, text, size, color, bold=False, italic=False):
    run.text = text
    f = run.font
    f.name = _FONT
    f.size = Pt(size)
    f.color.rgb = color
    f.bold = bold
    f.italic = italic


def _para(tf, first: bool):
    return tf.paragraphs[0] if first else tf.add_paragraph()


def _body_size(total_chars: int, base: float = 10.0) -> float:
    """Crude autofit: shrink the column font as its text grows so long albums
    stay inside the fixed slide (the reflow the HTML gets for free)."""
    if total_chars <= 500:
        return base
    if total_chars <= 900:
        return base - 1
    if total_chars <= 1400:
        return base - 2
    if total_chars <= 2200:
        return base - 2.5
    return base - 3


def _clip(text: str, limit: int) -> str:
    text = str(text)
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


# ---------------------------------------------------------------------------
# Slide chrome
# ---------------------------------------------------------------------------


def _head(slide, title: str):
    """Dark header band with the employee/session name — mirrors the HTML album
    header (functional identity strip, present on every sheet)."""
    band = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, _SLIDE_W, Inches(0.56))
    _fill(band, _INK)
    _, tf = _textbox(slide, Inches(0.45), Inches(0.06), Inches(10.6), Inches(0.44))
    p = tf.paragraphs[0]
    _set_run(p.add_run(), _clip(title, 90), 18, _PANEL, bold=True)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    _, tf = _textbox(slide, Inches(11.2), Inches(0.06), Inches(1.7), Inches(0.44))
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.RIGHT
    _set_run(p.add_run(), "TEMPO", 13, RGBColor.from_string("AEB7CC"), bold=True)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE


def _background(slide):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, _SLIDE_W, _SLIDE_H)
    _fill(bg, _PAPER)


# ---------------------------------------------------------------------------
# Title slide — session statistics
# ---------------------------------------------------------------------------


def _title_slide(prs: Presentation, info: dict):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, _SLIDE_W, _SLIDE_H)
    _fill(bg, _INK)

    _, tf = _textbox(slide, Inches(0.9), Inches(1.15), Inches(11.5), Inches(0.5))
    p = tf.paragraphs[0]
    _set_run(p.add_run(), "TEMPO", 20, RGBColor.from_string("AEB7CC"), bold=True)

    _, tf = _textbox(slide, Inches(0.9), Inches(1.75), Inches(11.5), Inches(1.7))
    p = tf.paragraphs[0]
    _set_run(
        p.add_run(), _clip(info.get("session_name") or "—", 120), 38, _PANEL, bold=True
    )

    labels = info.get("labels") or {}
    stats = [(labels.get("employees") or "—", str(info.get("qty") or 0))]
    if info.get("period"):
        stats.append((labels.get("period") or "—", info["period"]))
    if info.get("departments"):
        stats.append((labels.get("departments") or "—", info["departments"]))

    x = Inches(0.9)
    y = Inches(4.0)
    card_h = Inches(2.1)
    gap = Inches(0.35)
    # Departments can be a long list — that card gets double width.
    widths = []
    for lbl, _val in stats:
        widths.append(Inches(4.6) if lbl == labels.get("departments") else Inches(3.1))
    total = sum(int(w) for w in widths) + int(gap) * (len(stats) - 1)
    if total > int(Inches(11.5)):
        widths = [Emu(int(w) * int(Inches(11.5)) // total) for w in widths]

    for (lbl, val), w in zip(stats, widths):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, card_h)
        card.adjustments[0] = 0.08
        _fill(card, RGBColor.from_string("24365C"))
        _, tf = _textbox(
            slide, x + Inches(0.3), y + Inches(0.25), w - Inches(0.6), Inches(0.4)
        )
        p = tf.paragraphs[0]
        _set_run(
            p.add_run(), lbl.upper(), 11, RGBColor.from_string("AEB7CC"), bold=True
        )
        _, tf = _textbox(
            slide,
            x + Inches(0.3),
            y + Inches(0.7),
            w - Inches(0.6),
            card_h - Inches(0.95),
        )
        p = tf.paragraphs[0]
        long_val = len(str(val)) > 24
        _set_run(
            p.add_run(),
            _clip(val, 220),
            14 if long_val else 40,
            _PANEL if long_val else _ACCENT,
            bold=True,
        )
        x = x + w + gap


# ---------------------------------------------------------------------------
# Employee sheet
# ---------------------------------------------------------------------------


def _photo(slide, data: dict, x, y, w, h):
    blob = data.get("photo")
    if blob:
        try:
            pic = slide.shapes.add_picture(io.BytesIO(blob), x, y, height=h)
            if pic.width > w:  # too wide for the portrait box — fit by width
                slide.shapes._spTree.remove(pic._element)
                pic = slide.shapes.add_picture(io.BytesIO(blob), x, y, width=w)
                pic.top = y + (h - pic.height) // 2
            else:
                pic.left = x + (w - pic.width) // 2
            return
        except Exception:  # unreadable blob -> placeholder below
            pass
    ph = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    ph.adjustments[0] = 0.06
    _fill(ph, RGBColor.from_string("E9EBF0"), _BORDER)
    tf = ph.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    _set_run(p.add_run(), "—", 12, _MUTED)


def _identity_fields(data: dict) -> list[tuple[str, str]]:
    """(label, value) pairs — the HTML album's identity grid MINUS the two level
    rows, which get their own strip under the grid (long educations were
    overlapping the current level when they shared a grid row)."""
    g = data.get
    L = data.get("labels", {})

    def _join(a, b):
        parts = [str(v) for v in (a, b) if v not in (None, "")]
        return " · ".join(parts) if parts else None

    fields = [
        (L.get("birth_age"), _join(g("birth_date"), g("age"))),
        (L.get("marital_children"), g("marital_status")),
        (L.get("children"), g("children")),
        (L.get("position"), g("position")),
        (L.get("languages"), g("lang_level")),
        (L.get("education"), g("education")),
        (L.get("tenure"), g("tenure")),
        (L.get("talent_status_period"), g("talent_levels")),
    ]
    return [(lbl, val) for lbl, val in fields if lbl]


def _levels_strip(slide, data: dict, x, y, w, h):
    """Current + proposed level on one compact line (smaller font), placed under
    the identity grid next to the proposed level's natural reading position."""
    g = data.get
    L = data.get("labels", {})
    proposed = g("proposed_level")
    if proposed and g("proposed_level_status"):
        proposed = f"{proposed} ({g('proposed_level_status')})"

    _, tf = _textbox(slide, x, y, w, h)
    p = tf.paragraphs[0]
    first = True
    for lbl, val in (
        (L.get("current_level"), g("current_level")),
        (L.get("proposed_level"), proposed),
    ):
        if not lbl:
            continue
        if not first:
            _set_run(p.add_run(), "      ", 8, _MUTED)
        _set_run(p.add_run(), f"{lbl}: ", 8, _MUTED)
        _set_run(p.add_run(), _clip(str(val) if val else "—", 80), 8.5, _INK, bold=True)
        first = False


def _identity_grid(slide, fields: list[tuple[str, str]], x, y, w, h):
    """Two-column label/value grid, one text box per cell."""
    cols = 2
    rows = (len(fields) + cols - 1) // cols
    col_w = Emu((int(w) - int(Inches(0.25))) // cols)
    row_h = Emu(int(h) // max(rows, 1))
    for i, (lbl, val) in enumerate(fields):
        r, c = i // cols, i % cols
        cx = x + Emu(c * (int(col_w) + int(Inches(0.25))))
        cy = y + Emu(r * int(row_h))
        _, tf = _textbox(slide, cx, cy, col_w, row_h)
        p = tf.paragraphs[0]
        _set_run(p.add_run(), _clip(lbl, 60), 8, _MUTED)
        p2 = tf.add_paragraph()
        text = str(val) if val not in (None, "") else "—"
        # A grid cell is ~0.5" high (label + value): a long value must both
        # shrink and clip hard, or it wraps past its row onto the next label
        # (seen with multi-line university names).
        size = 10 if len(text) <= 40 else (8 if len(text) <= 90 else 7)
        _set_run(p2.add_run(), _clip(text, 140), size, _INK, bold=True)


def _competence_card(slide, data: dict, x, y, w, h):
    """White card with the horizontal competence bars (track + colored fill)."""
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    card.adjustments[0] = 0.05
    _fill(card, _PANEL, _BORDER)

    L = data.get("labels", {})
    _, tf = _textbox(
        slide, x + Inches(0.25), y + Inches(0.15), w - Inches(0.5), Inches(0.3)
    )
    p = tf.paragraphs[0]
    _set_run(p.add_run(), L.get("competence_level") or "—", 11, _INK, bold=True)

    comps = data.get("competences") or []
    if not comps:
        _, tf = _textbox(
            slide, x + Inches(0.25), y + Inches(0.6), w - Inches(0.5), Inches(0.3)
        )
        _set_run(tf.paragraphs[0].add_run(), "—", 10, _MUTED)
        return

    max_grade = data.get("max_grade") or 4
    inner_x = x + Inches(0.25)
    inner_w = w - Inches(0.5)
    name_w = Inches(1.75)
    val_w = Inches(0.55)
    track_w = Emu(int(inner_w) - int(name_w) - int(val_w) - int(Inches(0.2)))
    avail_h = int(h) - int(Inches(0.55))
    row_h = Emu(min(int(Inches(0.34)), avail_h // max(len(comps), 1)))
    bar_h = Emu(min(int(Inches(0.13)), int(row_h) - int(Pt(4))))

    cy = y + Inches(0.5)
    for c in comps:
        name, value, color = (tuple(c) + (None,) * 3)[:3]
        col = _rgb(color)
        _, tf = _textbox(slide, inner_x, cy, name_w, row_h)
        p = tf.paragraphs[0]
        _set_run(p.add_run(), _clip(name or "—", 40), 8, col, bold=True)
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE

        tx = inner_x + name_w + Inches(0.1)
        ty = cy + Emu((int(row_h) - int(bar_h)) // 2)
        track = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, tx, ty, track_w, bar_h
        )
        track.adjustments[0] = 0.5
        _fill(track, _TRACK)
        try:
            frac = max(0.0, min(1.0, float(value or 0) / max_grade))
        except (TypeError, ValueError):
            frac = 0.0
        if frac > 0.02:
            fillbar = slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE,
                tx,
                ty,
                Emu(int(int(track_w) * frac)),
                bar_h,
            )
            fillbar.adjustments[0] = 0.5
            _fill(fillbar, col)

        _, tf = _textbox(slide, tx + track_w + Inches(0.08), cy, val_w, row_h)
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.RIGHT
        _set_run(p.add_run(), _fmt_value(value), 9, col, bold=True)
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        cy = cy + row_h


def _section_column(slide, sections: list[dict], kpi_label: str, x, y, w, h):
    """One column of titled sections in a single flowing text box (like the HTML
    columns). Font size shrinks with total text so the column stays inside."""
    total = 0
    for sec in sections:
        total += len(sec.get("title") or "")
        total += len(sec.get("body") or "")
        for it in sec.get("comps") or []:
            total += len(it.get("name") or "") + sum(
                len(c) for c in it.get("comments") or []
            )
        for m in sec.get("missions") or []:
            total += (
                len(m.get("text") or "")
                + len(m.get("kpi") or "")
                + len(m.get("name") or "")
            )
    size = _body_size(total)
    title_size = size + 0.5

    _, tf = _textbox(slide, x, y, w, h)
    first = True
    for sec in sections:
        p = _para(tf, first)
        first = False
        p.space_before = Pt(0 if p is tf.paragraphs[0] else 7)
        _set_run(
            p.add_run(),
            str(sec.get("title") or "").upper(),
            title_size,
            _ACCENT if sec.get("accent") else _INK,
            bold=True,
        )
        if sec.get("comps") is not None:
            items = sec["comps"] or []
            if not items:
                p = tf.add_paragraph()
                _set_run(p.add_run(), "—", size, _MUTED)
            for it in items:
                p = tf.add_paragraph()
                p.space_before = Pt(2)
                _set_run(
                    p.add_run(),
                    _clip(it.get("name") or "—", 60),
                    size,
                    _rgb(it.get("color")),
                    bold=True,
                )
                for c in it.get("comments") or []:
                    p = tf.add_paragraph()
                    _set_run(p.add_run(), _clip(f"• {c}", 400), size, _INK)
        elif sec.get("missions") is not None:
            missions = sec["missions"] or []
            if not missions:
                p = tf.add_paragraph()
                _set_run(p.add_run(), "—", size, _MUTED)
            for n, m in enumerate(missions, start=1):
                p = tf.add_paragraph()
                p.space_before = Pt(2)
                _set_run(p.add_run(), _clip(f"{n}. {m.get('text')}", 400), size, _INK)
                if m.get("kpi"):
                    p = tf.add_paragraph()
                    run = p.add_run()
                    _set_run(run, f"{kpi_label}: ", size - 1, _INK, bold=True)
                    _set_run(p.add_run(), _clip(m["kpi"], 300), size - 1, _MUTED)
                if m.get("name"):
                    p = tf.add_paragraph()
                    _set_run(
                        p.add_run(),
                        _clip(m["name"], 60),
                        size - 1,
                        _rgb(m.get("color")),
                        bold=True,
                        italic=True,
                    )
        else:
            body = sec.get("body")
            for line in (str(body).splitlines() if body else ["—"]):
                if not line.strip():
                    continue
                p = tf.add_paragraph()
                _set_run(p.add_run(), _clip(line, 500), size, _INK if body else _MUTED)


def _employee_slide(prs: Presentation, data: dict):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _background(slide)
    _head(slide, data.get("full_name") or "—")

    # Top zone: photo + identity grid (left), competence bars (right); the two
    # level fields sit on their own compact strip under the grid so a long
    # education can never overlap them.
    _photo(slide, data, Inches(0.45), Inches(0.8), Inches(1.35), Inches(1.7))
    _identity_grid(
        slide,
        _identity_fields(data),
        Inches(2.0),
        Inches(0.8),
        Inches(4.5),
        Inches(2.3),
    )
    _levels_strip(slide, data, Inches(0.45), Inches(3.12), Inches(6.2), Inches(0.25))
    _competence_card(slide, data, Inches(6.75), Inches(0.75), Inches(6.15), Inches(2.4))

    # Lower zone: the HTML album's three columns — col1 results / not achieved /
    # IDP, col2 strong / to-develop competences, col3 training / feedbacks.
    L = data.get("labels", {})
    g = data.get
    col1 = [
        {"title": L.get("results"), "body": g("results_achievements")},
        {"title": L.get("not_achieved"), "body": g("not_achieved")},
        {"title": L.get("idp"), "accent": True, "missions": g("idp_missions") or []},
    ]
    col2 = [
        {
            "title": L.get("strengths"),
            "accent": True,
            "comps": g("strengths_items") or [],
        },
        {
            "title": L.get("development"),
            "accent": True,
            "comps": g("development_items") or [],
        },
    ]
    col3 = [
        {"title": L.get("training"), "body": g("training_done")},
        {"title": L.get("employee_feedback"), "body": g("employee_feedback")},
        {"title": L.get("manager_feedback"), "body": g("manager_feedback")},
    ]
    y = Inches(3.35)
    h = Emu(int(_SLIDE_H) - int(y) - int(Inches(0.3)))
    kpi = L.get("kpi") or "KPI"
    _section_column(
        slide, [s for s in col1 if s["title"]], kpi, Inches(0.45), y, Inches(4.7), h
    )
    _section_column(
        slide, [s for s in col2 if s["title"]], kpi, Inches(5.45), y, Inches(3.6), h
    )
    _section_column(
        slide, [s for s in col3 if s["title"]], kpi, Inches(9.35), y, Inches(3.55), h
    )


def _requirements_slide(prs: Presentation, data: dict):
    """Second slide for an employee with a proposed level: the frozen level
    requirements with the recorded facts."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _background(slide)
    _head(slide, data.get("full_name") or "—")

    L = data.get("labels", {})
    g = data.get
    title = L.get("level_requirements") or "—"
    if g("proposed_level"):
        title = f"{title}: {g('proposed_level')}"
        if g("proposed_level_status"):
            title = f"{title} ({g('proposed_level_status')})"
    _, tf = _textbox(slide, Inches(0.45), Inches(0.75), Inches(12.4), Inches(0.4))
    p = tf.paragraphs[0]
    _set_run(p.add_run(), _clip(title, 140), 15, _ACCENT, bold=True)
    if g("proposed_level_sense"):
        _set_run(
            p.add_run(), f"   {g('proposed_level_sense')}", 12, _MUTED, italic=True
        )

    reqs = g("level_requirements") or []
    x = Inches(0.45)
    y = Inches(1.3)
    w = Inches(12.45)
    h = Emu(int(_SLIDE_H) - int(y) - int(Inches(0.3)))
    if len(reqs) > 3:  # long ladders split into two columns
        half = (len(reqs) + 1) // 2
        cols = [(0, reqs[:half]), (half, reqs[half:])]
        col_w = Emu((int(w) - int(Inches(0.4))) // 2)
        xs = [x, x + col_w + Inches(0.4)]
    else:
        cols = [(0, reqs)]
        col_w = w
        xs = [x]

    for cx, (offset, chunk) in zip(xs, cols):
        total = sum(len(r.get("text") or "") + len(r.get("facts") or "") for r in chunk)
        size = _body_size(total, base=10.5)
        _, tf = _textbox(slide, cx, y, col_w, h)
        first = True
        for i, r in enumerate(chunk):
            n = offset + i + 1
            p = _para(tf, first)
            first = False
            p.space_before = Pt(0 if p is tf.paragraphs[0] else 8)
            _set_run(
                p.add_run(),
                _clip(f"{n}. {r.get('text') or '—'}", 300),
                size,
                _INK,
                bold=True,
            )
            p = tf.add_paragraph()
            facts = r.get("facts")
            _set_run(
                p.add_run(),
                _clip(facts, 700) if facts else "—",
                size - 0.5,
                _INK if facts else _MUTED,
            )
        if not chunk and first:
            _set_run(tf.paragraphs[0].add_run(), "—", size, _MUTED)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def build_tempo_pptx(session_info: dict, sheets: list[dict]) -> bytes:
    """The whole session deck: stats title slide, then 1-2 slides per employee
    (2 when a new level is proposed — the requirements get their own slide)."""
    prs = Presentation()
    prs.slide_width = _SLIDE_W
    prs.slide_height = _SLIDE_H

    _title_slide(prs, session_info)
    for data in sheets:
        _employee_slide(prs, data)
        if data.get("has_level_registration"):
            _requirements_slide(prs, data)

    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()
