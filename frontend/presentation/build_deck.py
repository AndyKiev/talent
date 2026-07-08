# -*- coding: utf-8 -*-
"""
Rebuild the People Review deck for the HR director:
  * recolour the existing navy/ice theme -> RED + GREEN (Auchan-style),
  * enrich it with business-logic slides,
  * add labelled screenshot placeholders that auto-fill from ./shots/<key>.png.

Idempotent-ish: always rebuilds from the BACKUP so re-running after dropping
new screenshots into ./shots simply re-inserts them. Existing Ukrainian text is
read straight from the .pptx (correct unicode) and never retyped.
"""
import io, os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BACKUP = os.path.join(HERE, "people_review_hr_director.BACKUP.pptx")
OUT = os.path.join(HERE, "people_review_hr_director.pptx")
SHOTS = os.path.join(HERE, "shots")

# ---- palette -----------------------------------------------------------------
RED        = "C8102E"   # primary brand red (titles, bars, role names)
DARK_RED   = "7A0A1C"   # deep red — dark-slide backgrounds / circles
GREEN      = "2E7D32"   # accent / positive (badges, advantages, stat boxes)
DARK_GREEN = "1B5E20"
TEXT_DARK  = "22293B"   # near-black body
MUTED      = "5A6478"   # secondary text
LIGHT_RED  = "F7D5D5"   # light text on dark-red slides
LIGHT_RED2 = "E7A9A9"   # dimmer light text on dark-red
LABEL_MUT  = "A06A6A"   # "СКРІНШОТ" muted red-grey
RED_TINT   = "FBEAEA"   # light red card fill
GREEN_TINT = "E7F5E8"   # light green card fill
NEUTRAL    = "F5F3F1"   # screenshot placeholder fill
NEUTRAL_BD = "E2D9D5"   # placeholder border
WHITE      = "FFFFFF"
HEAD = "Cambria"
BODY = "Calibri"

# ---- colour remap for the EXISTING 7 slides ---------------------------------
# default value->value map (applies to both fills and font colours)
REMAP = {
    "27336F": DARK_RED,   # dark-slide big circles / panels
    "1E2761": RED,        # navy accent (titles, role names)  [fills overridden below]
    "CADCFC": LIGHT_RED,  # light text on dark
    "9FB4E4": LIGHT_RED2, # title subtitle on dark
    "6B7CA6": LABEL_MUT,  # screenshot label
    "F3F6FB": NEUTRAL,    # screenshot placeholder fill
    "EEF4FE": RED_TINT,   # light card fill (role cards)
    "2C5F2D": GREEN,      # advantages text (already green) -> unify
    # kept as-is: 22293B, 5A6478, F5F5F5, FFFFFF
}
# (slide_idx, shape_idx) -> explicit FILL colour, overriding REMAP
FILL_OVERRIDES = {
    (0, 1): GREEN,        # title: 2nd circle green accent
    (5, 1): GREEN_TINT,   # slide 6 advantages box -> green tint
    (6, 2): GREEN, (6, 5): GREEN, (6, 8): GREEN,   # summary stat boxes -> green
}
# navy FILLS that should become GREEN (number / letter badges), by value
FILL_NAVY_TO_GREEN = {"1E2761"}
# (slide_idx, shape_idx) -> explicit first-run FONT colour override
FONT_OVERRIDES = {
    (5, 2): GREEN,        # "Talent — переваги" header -> green
}


def remap_fill(shape, sidx, shidx):
    try:
        f = shape.fill
        if f.type is None:
            return
        cur = str(f.fore_color.rgb)
    except Exception:
        return
    key = (sidx, shidx)
    if key in FILL_OVERRIDES:
        f.fore_color.rgb = RGBColor.from_string(FILL_OVERRIDES[key]); return
    if cur in FILL_NAVY_TO_GREEN:
        f.fore_color.rgb = RGBColor.from_string(GREEN); return
    if cur in REMAP:
        f.fore_color.rgb = RGBColor.from_string(REMAP[cur])


def remap_fonts(shape, sidx, shidx):
    if not shape.has_text_frame:
        return
    first = True
    for para in shape.text_frame.paragraphs:
        for run in para.runs:
            try:
                if run.font.color and run.font.color.type is not None:
                    cur = str(run.font.color.rgb)
                    if first and (sidx, shidx) in FONT_OVERRIDES:
                        run.font.color.rgb = RGBColor.from_string(FONT_OVERRIDES[(sidx, shidx)])
                    elif cur in REMAP:
                        run.font.color.rgb = RGBColor.from_string(REMAP[cur])
            except Exception:
                pass
            first = False


# ---- generic builders --------------------------------------------------------
def _set_line(shape, color=None, width=1.0, dash=None):
    ln = shape.line
    if color is None:
        ln.fill.background()
    else:
        ln.color.rgb = RGBColor.from_string(color)
        ln.width = Pt(width)
    if dash is not None:
        from pptx.oxml.ns import qn
        d = ln._get_or_add_ln()
        pd = d.find(qn('a:prstDash'))
        if pd is None:
            pd = d.makeelement(qn('a:prstDash'), {}); d.append(pd)
        pd.set('val', dash)


def add_rect(slide, x, y, w, h, fill=None, line=None, lw=1.0, rounded=True, radius=0.06, dash=None):
    shp = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE,
        Inches(x), Inches(y), Inches(w), Inches(h))
    if rounded:
        try: shp.adjustments[0] = radius
        except Exception: pass
    if fill is None:
        shp.fill.background()
    else:
        shp.fill.solid(); shp.fill.fore_color.rgb = RGBColor.from_string(fill)
    _set_line(shp, line, lw, dash)
    shp.shadow.inherit = False
    return shp


def _md_runs(text, color=TEXT_DARK, size=12.5, bold_color=None, font=BODY):
    """split **bold** markup into run-tuples (text, color, bold, size, font)."""
    out = []
    for i, part in enumerate(text.split("**")):
        if part == "":
            continue
        b = (i % 2 == 1)
        out.append((part, (bold_color or TEXT_DARK) if b else color, b, size, font))
    return out


def add_text(slide, x, y, w, h, paras, anchor=None):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.05)
    tf.margin_top = tf.margin_bottom = Inches(0.03)
    if anchor is not None:
        tf.vertical_anchor = anchor
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = para.get("align", PP_ALIGN.LEFT)
        p.space_after = Pt(para.get("sa", 6))
        p.space_before = Pt(para.get("sb", 0))
        if para.get("line") is not None:
            p.line_spacing = para["line"]
        for run in para["runs"]:
            r = p.add_run()
            r.text = run[0]
            r.font.color.rgb = RGBColor.from_string(run[1])
            r.font.bold = run[2]
            r.font.size = Pt(run[3] if len(run) > 3 and run[3] else para.get("size", 12.5))
            r.font.name = run[4] if len(run) > 4 and run[4] else BODY
    return tb


def title(slide, text):
    add_text(slide, 0.50, 0.30, 9.00, 0.62,
             [{"runs": [(text, RED, True, 27, HEAD)]}])


def bullet(text, size=12.5, mark=GREEN):
    return {"runs": [("▪  ", mark, True, size)] + _md_runs(text, size=size),
            "sa": 8, "line": 1.02, "size": size}


def insert_shot(slide, x, y, w, h, key, cap_title, cap_sub):
    """Fill the box with shots/<key>.png if present, else a labelled placeholder."""
    path = os.path.join(SHOTS, key + ".png")
    add_rect(slide, x, y, w, h, fill=NEUTRAL, line=NEUTRAL_BD, lw=1.25, dash="dash")
    if os.path.exists(path):
        pad = 0.10
        bw, bh = w - 2 * pad, h - 2 * pad
        try:
            iw, ih = Image.open(path).size
        except Exception:
            iw, ih = bw, bh
        ar_box, ar_img = bw / bh, iw / ih
        if ar_img > ar_box:
            pw = bw; ph = bw / ar_img
        else:
            ph = bh; pw = bh * ar_img
        px = x + (w - pw) / 2
        py = y + (h - ph) / 2
        slide.shapes.add_picture(path, Inches(px), Inches(py), Inches(pw), Inches(ph))
    else:
        add_text(slide, x + 0.15, y, w - 0.30, h,
                 [{"runs": [("СКРІНШОТ", LABEL_MUT, True, 11.5)], "sa": 3, "align": PP_ALIGN.CENTER},
                  {"runs": [(cap_title, RED, True, 12.5)], "sa": 2, "align": PP_ALIGN.CENTER},
                  {"runs": [(cap_sub, MUTED, False, 10.5)], "align": PP_ALIGN.CENTER}],
                 anchor=MSO_ANCHOR.MIDDLE)


def blank_slide(prs, layout):
    s = prs.slides.add_slide(layout)
    for shp in list(s.shapes):
        if shp.is_placeholder:
            shp._element.getparent().remove(shp._element)
    return s


def move_slide(prs, from_idx, to_idx):
    lst = prs.slides._sldIdLst
    els = list(lst)
    el = els[from_idx]
    lst.remove(el)
    lst.insert(to_idx, el)


# ---- new content slides ------------------------------------------------------
def slide_lifecycle(prs, layout):
    s = blank_slide(prs, layout)
    title(s, "Життєвий цикл сесії та контроль повноти")
    add_text(s, 0.50, 1.02, 4.35, 4.0, [
        bullet("Сесія проходить етапи: **очікує → відкрита → закрита**. Оцінювати можна лише у відкритій сесії."),
        bullet("Кожен працівник має власний статус: **відкрито → переглянуто → закрито** — оцінювач веде людину цими кроками."),
        bullet("Прогрес видно наочно: скільки компетенцій **оцінено** та скільки підкріплено **фактами** (дві шкали на кожного)."),
        bullet("«Переглянуто» вмикається лише коли заповнені **всі** виміри та ухвалено рішення про рівень.", mark=RED),
        bullet("Керівник будь-коли бачить, хто ще не завершив, і може повернути форму на доопрацювання.", mark=RED),
    ])
    insert_shot(s, 5.05, 1.02, 4.45, 4.10, "roster_progress",
                "Ростер сесії № 7 — статуси та прогрес",
                "дві шкали: оцінки + факти, дії зі статусами")
    return s


def slide_competences(prs, layout):
    s = blank_slide(prs, layout)
    title(s, "Компетенції: оцінка, підкріплена фактами")
    add_text(s, 0.50, 1.02, 4.35, 4.0, [
        bullet("Кожна компетенція оцінюється за кількома **індикаторами поведінки** — зірочками; система рахує середнє."),
        bullet("До кожної компетенції додаються **факти** — конкретні приклади поведінки, що доводять оцінку."),
        bullet("Окремо фіксуються **напрями для розвитку** — що саме покращити."),
        bullet("Візуальна **діаграма** показує профіль сильних і слабких сторін з першого погляду."),
        bullet("Факти можна переносити між компетенціями — оцінка спирається на **докази**, а не на враження."),
    ])
    insert_shot(s, 5.05, 1.02, 4.45, 4.10, "dimension_panel",
                "Оцінка компетенції: індикатори + факти",
                "зірочки, середнє, факти, діаграма")
    return s


def slide_level(prs, layout):
    s = blank_slide(prs, layout)
    title(s, "Підсумок компетенцій і рішення про рівень")
    add_text(s, 0.50, 1.02, 4.35, 4.0, [
        bullet("Оцінювач виділяє **сильні сторони** та **зони розвитку** — короткий підсумок по працівнику."),
        bullet("Пропонується **рівень** працівника; підвищення потрібно **обґрунтувати** за вимогами цього рівня."),
        bullet("Система порівнює пропонований рівень із поточним: **підвищення / підтвердження / зниження**."),
        bullet("Без обґрунтованого рішення про рівень форму **не можна** позначити як «переглянуто» — рішення завжди аргументоване.", mark=RED),
    ])
    insert_shot(s, 5.05, 1.02, 4.45, 4.10, "proposed_level",
                "Пропонований рівень і підсумок",
                "сильні сторони, зони розвитку, рівень")
    return s


def slide_devplan(prs, layout):
    s = blank_slide(prs, layout)
    title(s, "Індивідуальний план розвитку")
    add_text(s, 0.50, 1.02, 4.35, 4.0, [
        bullet("За підсумком оцінки формується **план розвитку** — конкретні місії/завдання на період."),
        bullet("Кожна місія має **KPI** — вимірюваний результат, а не абстрактне «покращити»."),
        bullet("Місію можна **прив’язати до компетенції**, яку розвиваємо, — план випливає з оцінки."),
        bullet("Кількість місій регулюється налаштуваннями (мінімум/максимум) — єдиний стандарт для всіх."),
        bullet("План зберігається разом з оцінкою і потрапляє у звіт **TEMPO**."),
    ])
    insert_shot(s, 5.05, 1.02, 4.45, 4.10, "dev_plan",
                "План розвитку: місії та KPI",
                "завдання, KPI, прив’язка до компетенції")
    return s


def slide_presentation(prs, layout):
    s = blank_slide(prs, layout)
    title(s, "Презентація та аналітика сесії")
    add_text(s, 0.50, 1.02, 4.35, 4.0, [
        bullet("**Режим презентації** — усі працівники сесії одним слайд-шоу з навігацією ◀ ▶ для комітету."),
        bullet("Порядок показу можна **переставляти** (черга презентації) — під конкретну зустріч."),
        bullet("**Аналітика сесії** — зведені показники по вимірах і підрозділах в один клік."),
        bullet("**Автозбереження**: кожна зміна зберігається автоматично — дані не втрачаються."),
        bullet("**Двомовність** укр/eng — і в інтерфейсі, і у звітах."),
    ])
    insert_shot(s, 5.05, 1.02, 4.45, 4.10, "presentation",
                "Презентація сесії та аналітика",
                "слайд-шоу працівників + зведені показники")
    return s


# ---- existing screenshot placeholders -> auto-fill from ./shots --------------
# (slide_idx, x, y, w, h, key) for the boxes already present in the deck.
EXISTING_SHOTS = [
    (1, 4.95, 1.00, 4.55, 4.15, "sessions_list"),
    (2, 4.95, 1.00, 4.55, 1.98, "form_dimensions"),
    (2, 4.95, 3.15, 4.55, 1.98, "form_level_plan"),
    (3, 0.50, 3.48, 9.00, 1.60, "roles_three"),
    (4, 0.50, 1.50, 4.40, 2.55, "report_pdf"),
    (4, 5.10, 1.50, 4.40, 2.55, "report_html"),
]


def fill_existing_shot(slide, x, y, w, h, key):
    """Overlay shots/<key>.png on top of an existing placeholder box, if present."""
    path = os.path.join(SHOTS, key + ".png")
    if not os.path.exists(path):
        return
    pad = 0.10
    bw, bh = w - 2 * pad, h - 2 * pad
    try:
        iw, ih = Image.open(path).size
    except Exception:
        iw, ih = bw, bh
    ar_box, ar_img = bw / bh, iw / ih
    if ar_img > ar_box:
        pw = bw; ph = bw / ar_img
    else:
        ph = bh; pw = bh * ar_img
    px = x + (w - pw) / 2
    py = y + (h - ph) / 2
    # white backing so a transparent/partial shot still reads cleanly
    add_rect(slide, x + 0.04, y + 0.04, w - 0.08, h - 0.08, fill=WHITE, line=NEUTRAL_BD, lw=1.0, radius=0.05)
    slide.shapes.add_picture(path, Inches(px), Inches(py), Inches(pw), Inches(ph))


# ---- main --------------------------------------------------------------------
def main():
    prs = Presentation(BACKUP)
    layout = prs.slides[1].slide_layout  # a content layout already in the file

    # 1) recolour every existing slide
    for si, slide in enumerate(prs.slides):
        for hi, shape in enumerate(slide.shapes):
            remap_fill(shape, si, hi)
            remap_fonts(shape, si, hi)

    # 2) drop screenshots into the existing placeholders (if files exist)
    for si, x, y, w, h, key in EXISTING_SHOTS:
        fill_existing_shot(prs.slides[si], x, y, w, h, key)

    # 3) build the new business-logic slides (appended, then moved into place)
    n_before = len(prs.slides._sldIdLst)
    slide_lifecycle(prs, layout)     # -> after slide 2 (idx 2)
    slide_competences(prs, layout)   # -> after "Форма оцінки" (idx 4)
    slide_level(prs, layout)         # -> idx 5
    slide_devplan(prs, layout)       # -> idx 6
    slide_presentation(prs, layout)  # -> after reports (idx 10)

    # appended order: [lifecycle, competences, level, devplan, presentation]
    # target final order (0-based):
    #  0 title | 1 what-is (+shot) | 2 LIFECYCLE | 3 form-blocks |
    #  4 COMPETENCES | 5 LEVEL | 6 DEVPLAN | 7 roles | 8 reports |
    #  9 PRESENTATION | 10 talent-vs-excel | 11 summary
    life, comp, lvl, dev, pres = range(n_before, n_before + 5)
    # move one at a time; indices shift as we insert, so recompute via helper.
    move_slide(prs, life, 2)
    move_slide(prs, comp, 4)
    move_slide(prs, lvl, 5)
    move_slide(prs, dev, 6)
    move_slide(prs, pres, 9)

    prs.save(OUT)
    print("saved", OUT, "slides:", len(prs.slides._sldIdLst))


if __name__ == "__main__":
    main()
