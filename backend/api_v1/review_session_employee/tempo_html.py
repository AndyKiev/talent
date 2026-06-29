"""TEMPO evaluation album as HTML — an interactive single-page view of the same
data the matplotlib PDF renders (shared `_tempo_data` dict, no logic drift).

Two entry points, both returning a self-contained HTML string (inline CSS+JS, no
external assets) so the frontend can fetch it with the JWT and open it as a blob:

* ``render_tempo_html(data)`` — one employee's sheet, with an in-page link from
  the top to the level-requirements section and back.
* ``render_tempo_presentation(sheets)`` — every employee assigned to the
  oversighter (in his order) as slides, with ◀ ▶ (and arrow-key) navigation. All
  navigation is client-side within the one fetched document, so no per-slide
  request (and thus no auth-on-navigation) is needed.

Text reflows naturally (CSS), so long fields are shown in full — the autofit the
matplotlib sheet can't do.
"""

from __future__ import annotations

import base64
from typing import Optional

import jinja2

_ENV = jinja2.Environment(autoescape=True)  # escape all user-provided text


def _fmt_value(v) -> str:
    """Competence level is a MEAN of behaviours — always 2 decimals so it never
    reads as a rounded whole grade (3.00, not 3)."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return "—"
    return f"{f:.2f}"


def _prep(data: dict) -> dict:
    """Shape one `_tempo_data` dict into the flat structure the template wants."""
    g = data.get
    L = data.get("labels", {})

    photo_uri = None
    if g("photo"):
        mime = g("photo_mime") or "image/jpeg"
        photo_uri = f"data:{mime};base64,{base64.b64encode(g('photo')).decode()}"

    max_grade = g("max_grade") or 4
    competences = []
    for c in g("competences") or []:
        name, value, color = (c + (None,) * 3)[:3]
        pct = max(0.0, min(100.0, (float(value or 0) / max_grade) * 100))
        competences.append(
            {
                "name": name,
                "value": _fmt_value(value),
                "pct": pct,
                "color": color or "#1565C0",
            }
        )

    proposed = g("proposed_level")
    if proposed and g("proposed_level_status"):
        proposed = f"{proposed} ({g('proposed_level_status')})"

    # Two-column identity grid (label, value) pairs.
    fields = [
        (L.get("birth_age"), _join(g("birth_date"), g("age"), " · ")),
        (L.get("marital_children"), g("marital_status")),
        (L.get("children"), g("children")),
        (L.get("position"), g("position")),
        (L.get("languages"), g("lang_level")),
        (L.get("education"), g("education")),
        (L.get("tenure"), g("tenure")),
        (L.get("current_level"), g("current_level")),
        (L.get("proposed_level"), proposed),
        (L.get("talent_status_period"), g("talent_levels")),
    ]

    # IDP missions: each is {text, dimension_key, name, color}; the template shows
    # the text plus the linked competence name in its own color (same as the page).
    idp = g("idp_missions") or []

    # Lower-grid sections. Most are {title, accent, body}; the strong /
    # to-develop competences carry {items} instead — each a named, DB-colored
    # competence with its comments, rendered specially by the template. The IDP
    # carries {missions} — colored per-mission competence labels.
    sections = [
        {"title": L.get("results"), "accent": False, "body": g("results_achievements")},
        {"title": L.get("not_achieved"), "accent": False, "body": g("not_achieved")},
        {"title": L.get("strengths"), "accent": True, "comps": g("strengths_items")},
        {
            "title": L.get("development"),
            "accent": True,
            "comps": g("development_items"),
        },
        {"title": L.get("idp"), "accent": True, "missions": idp},
        {"title": L.get("training"), "accent": False, "body": g("training_done")},
        {
            "title": L.get("employee_feedback"),
            "accent": False,
            "body": g("employee_feedback"),
        },
        {
            "title": L.get("manager_feedback"),
            "accent": False,
            "body": g("manager_feedback"),
        },
    ]

    reqs = []
    for i, r in enumerate(g("level_requirements") or [], start=1):
        reqs.append({"n": i, "text": r.get("text") or "—", "facts": r.get("facts")})

    req_title = L.get("level_requirements", "Level requirements")
    if g("proposed_level"):
        req_title = f"{req_title}: {g('proposed_level')}"

    return {
        "name": g("full_name") or "—",
        "photo_uri": photo_uri,
        "competence_title": L.get("competence_level", "—"),
        "competences": competences,
        "fields": [(lbl, val) for lbl, val in fields if lbl],
        "sections": [s for s in sections if s["title"]],
        # Resolved titles so the column split can address sections by role
        # (not by list position, which empty sections would shift).
        "section_titles": {
            "results": L.get("results"),
            "not_achieved": L.get("not_achieved"),
            "strengths": L.get("strengths"),
            "development": L.get("development"),
            "idp": L.get("idp"),
        },
        "requirements": reqs,
        "req_title": req_title,
        "req_sense": g("proposed_level_sense"),
        "has_requirements": bool(g("has_level_registration") or reqs),
    }


def _join(a, b, sep) -> Optional[str]:
    parts = [str(x) for x in (a, b) if x not in (None, "")]
    return sep.join(parts) if parts else None


_CSS = """
:root{--ink:#1b2a4a;--accent:#e4572e;--muted:#8a93a6;--paper:#f7f6f2;
--panel:#fff;--border:#d8dbe2;}
*{box-sizing:border-box;}
body{margin:0;background:var(--paper);color:var(--ink);
font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:13px;}
.slide{display:none;max-width:1680px;margin:0 auto;padding:0 28px 40px;}
.slide.active{display:block;}
.head{position:sticky;top:0;z-index:5;background:var(--ink);color:#fff;
display:flex;align-items:center;justify-content:space-between;
padding:10px 16px;border-bottom:3px solid var(--accent);}
.head h1{font-size:18px;margin:0;font-weight:700;}
.head .brand{color:#aeb7cc;font-weight:700;letter-spacing:1px;}
.top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);
gap:14px;margin-top:14px;align-items:start;}
.idwrap{display:grid;grid-template-columns:96px 1fr;gap:12px;}
.photo{width:96px;height:120px;object-fit:cover;border:1px solid var(--border);
border-radius:8px;background:#e9ebf0;}
.photo.empty{display:flex;align-items:center;justify-content:center;
color:var(--muted);font-size:11px;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;}
.field .lbl{color:var(--muted);font-size:11px;}
.field .val{font-size:13px;font-weight:600;}
.card{background:var(--panel);border:1px solid var(--border);border-radius:10px;
padding:12px 14px;}
.chart .row{display:flex;align-items:center;gap:8px;margin:7px 0;}
.chart .nm{width:150px;flex:none;font-size:11px;font-weight:600;
overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.chart .track{flex:1;height:12px;border-radius:6px;background:#eceef3;
position:relative;overflow:hidden;}
.chart .fill{position:absolute;left:0;top:0;bottom:0;border-radius:6px;}
.chart .sc{width:42px;text-align:right;font-size:12px;font-weight:700;}
/* Col 1 (results / not achieved / development) is the fullest, so it gets the
   most room; the other two split the rest evenly. */
.cols{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:14px;margin-top:14px;}
.sec{margin-bottom:14px;}
.sec h3{margin:0 0 4px;font-size:13px;font-weight:700;text-transform:uppercase;
letter-spacing:.3px;}
.sec.accent h3{color:var(--accent);}
.sec .body{font-size:12.5px;line-height:1.5;white-space:pre-wrap;
word-break:break-word;}
.sec .body.empty{color:var(--muted);}
/* A named, colored competence in the strong / to-develop summary. */
.cmp{margin-bottom:8px;}
.cmp-name{font-size:12.5px;font-weight:700;margin-bottom:2px;}
.cmp .body{margin-left:2px;}
/* An IDP mission: its text plus a colored competence-to-develop tag. */
.mission{margin-bottom:8px;}
.mtag{display:inline-block;margin-top:3px;font-size:11px;font-weight:700;
border:1px solid;border-radius:10px;padding:1px 8px;}
.req{margin-top:8px;}
.req .item{background:var(--panel);border:1px solid var(--border);
border-radius:10px;padding:10px 14px;margin-bottom:10px;}
.req .item .t{font-weight:700;font-size:13px;margin-bottom:4px;}
.req .item .f{font-size:12.5px;line-height:1.5;white-space:pre-wrap;
word-break:break-word;}
.jump{display:inline-block;margin-top:6px;color:var(--accent);
text-decoration:none;font-weight:600;font-size:12.5px;}
.jump:hover{text-decoration:underline;}
.nav{position:fixed;bottom:0;left:0;right:0;background:rgba(27,42,74,.96);
color:#fff;display:flex;align-items:center;justify-content:center;gap:18px;
padding:8px;z-index:10;}
.nav button{background:#fff;color:var(--ink);border:none;border-radius:8px;
padding:7px 16px;font-size:15px;font-weight:700;cursor:pointer;}
.nav button:disabled{opacity:.4;cursor:default;}
.nav .who{min-width:240px;text-align:center;font-weight:600;}
@media print{.nav{display:none;}.slide{display:block;}}
"""

_SHEET = """
<section class="slide {% if idx == 0 %}active{% endif %}" data-idx="{{ idx }}">
  <div class="head"><h1>{{ s.name }}</h1><span class="brand">TEMPO</span></div>

  <div class="top">
    <div class="idwrap">
      {% if s.photo_uri %}<img class="photo" src="{{ s.photo_uri }}" alt="">
      {% else %}<div class="photo empty">—</div>{% endif %}
      <div class="grid2">
        {% for lbl, val in s.fields %}
        <div class="field"><div class="lbl">{{ lbl }}</div>
          <div class="val">{{ val if val else "—" }}</div></div>
        {% endfor %}
      </div>
    </div>
    <div class="card chart">
      <h3 style="margin:0 0 8px;font-size:13px;">{{ s.competence_title }}</h3>
      {% for c in s.competences %}
      <div class="row">
        <div class="nm" style="color:{{ c.color }}">{{ c.name }}</div>
        <div class="track"><div class="fill"
             style="width:{{ c.pct }}%;background:{{ c.color }}"></div></div>
        <div class="sc" style="color:{{ c.color }}">{{ c.value }}</div>
      </div>
      {% else %}<div class="sec body empty">—</div>{% endfor %}
    </div>
  </div>

  <div class="cols">
    {% for col in s.section_cols %}
    <div>
      {% for sec in col %}
      <div class="sec {% if sec.accent %}accent{% endif %}">
        <h3>{{ sec.title }}</h3>
        {% if sec.comps is defined %}
          {% if sec.comps %}
            {% for it in sec.comps %}
            <div class="cmp">
              <div class="cmp-name" style="color:{{ it.color }}">{{ it.name }}</div>
              {% if it.comments %}<div class="body">{% for c in it.comments %}• {{ c }}{% if not loop.last %}<br>{% endif %}{% endfor %}</div>{% endif %}
            </div>
            {% endfor %}
          {% else %}<div class="body empty">—</div>{% endif %}
        {% elif sec.missions is defined %}
          {% if sec.missions %}
            {% for m in sec.missions %}
            <div class="mission">
              <div class="body">{{ loop.index }}. {{ m.text }}</div>
              {% if m.name %}<span class="mtag" style="color:{{ m.color }};border-color:{{ m.color }}">{{ m.name }}</span>{% endif %}
            </div>
            {% endfor %}
          {% else %}<div class="body empty">—</div>{% endif %}
        {% else %}
          <div class="body {% if not sec.body %}empty{% endif %}">{{ sec.body if sec.body else "—" }}</div>
        {% endif %}
      </div>
      {% endfor %}
    </div>
    {% endfor %}
  </div>

  {% if s.has_requirements %}
  <div style="margin-top:6px">
    <a class="jump" href="#req-{{ idx }}">▼ {{ s.req_title }}</a>
  </div>
  <div class="req" id="req-{{ idx }}">
    {% for r in s.requirements %}
    <div class="item"><div class="t">{{ r.n }}. {{ r.text }}</div>
      <div class="f {% if not r.facts %}empty{% endif %}">{{ r.facts if r.facts else "—" }}</div></div>
    {% else %}<div class="sec body empty">—</div>{% endfor %}
    <a class="jump" href="#top-{{ idx }}">▲</a>
  </div>
  {% endif %}
</section>
"""

_DOC = """<!DOCTYPE html>
<html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ title }}</title><style>{{ css }}</style></head>
<body>
{% for s in sheets %}
  {% set idx = loop.index0 %}
  <a id="top-{{ idx }}"></a>
  {{ render_sheet(s, idx) | safe }}
{% endfor %}
{% if sheets|length > 1 %}
<div class="nav">
  <button id="prev">◀</button>
  <span class="who" id="who"></span>
  <button id="next">▶</button>
</div>
<script>
(function(){
  var slides=[].slice.call(document.querySelectorAll('.slide'));
  var who=document.getElementById('who');
  var prev=document.getElementById('prev'),next=document.getElementById('next');
  var i=0;
  function show(n){
    i=Math.max(0,Math.min(slides.length-1,n));
    slides.forEach(function(s,k){s.classList.toggle('active',k===i);});
    who.textContent=(i+1)+' / '+slides.length+' — '+
      slides[i].querySelector('.head h1').textContent;
    prev.disabled=(i===0);next.disabled=(i===slides.length-1);
    window.scrollTo(0,0);
  }
  prev.onclick=function(){show(i-1);};
  next.onclick=function(){show(i+1);};
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowLeft')show(i-1);
    if(e.key==='ArrowRight')show(i+1);
  });
  show(0);
})();
</script>
{% endif %}
</body></html>
"""


def _render_sheet(s: dict, idx: int) -> str:
    # Split the 8 sections into 3 columns. The Development PLAN (IDP missions)
    # sits in column 1 under "not achieved"; column 1 = results / not achieved /
    # IDP, column 2 = strengths / to-develop competences, col 3 = training /
    # feedbacks. Keyed by title so hidden (empty-title) sections can't shift it.
    secs = s["sections"]
    titles = s["section_titles"]
    col1_keys = {titles["results"], titles["not_achieved"], titles["idp"]}
    col2_keys = {titles["strengths"], titles["development"]}
    col1 = [sec for sec in secs if sec["title"] in col1_keys]
    col2 = [sec for sec in secs if sec["title"] in col2_keys]
    col3 = [sec for sec in secs if sec["title"] not in col1_keys | col2_keys]
    s = {**s, "section_cols": [col1, col2, col3]}
    return _ENV.from_string(_SHEET).render(s=s, idx=idx)


def render_tempo_html(data: dict) -> str:
    """Standalone HTML for a single employee's TEMPO sheet."""
    sheet = _prep(data)
    tmpl = _ENV.from_string(_DOC)
    return tmpl.render(
        title=sheet["name"], css=_CSS, sheets=[sheet], render_sheet=_render_sheet
    )


def render_tempo_presentation(sheets_data: list[dict], title: str = "TEMPO") -> str:
    """One document with every employee as a slide + ◀ ▶ navigation."""
    sheets = [_prep(d) for d in sheets_data]
    if not sheets:
        sheets = []
    tmpl = _ENV.from_string(_DOC)
    return tmpl.render(title=title, css=_CSS, sheets=sheets, render_sheet=_render_sheet)
