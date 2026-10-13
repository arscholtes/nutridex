"""Style check for creature SVGs: usage: python3 art-lint.py batches.json ; exits 1 on any problem."""
import json
import pathlib
import re
import sys
import xml.dom.minidom

ART = pathlib.Path("/Users/alexscholtes/Developer/foodi-dex/public/art/ingredients")
batches = json.load(open(sys.argv[1]))
problems, missing, ok = [], [], 0
for b in batches:
    for it in b["items"]:
        f = ART / f"{it['key']}.svg"
        if not f.exists():
            missing.append(it["key"])
            continue
        s = f.read_text()
        errs = []
        try:
            xml.dom.minidom.parseString(s)
        except Exception as e:  # noqa: BLE001 — any parse failure is the finding
            errs.append(f"not XML: {e}")
        if 'viewBox="0 0 256 256"' not in s: errs.append("canvas")
        if f'<title id="t">{it["name"]}</title>' not in s: errs.append("title")
        if f'fill="{it["tint"]}"' not in s.split("\n", 4)[-1][:400] and f'fill="{it["tint"]}"' not in s[:600]: errs.append("tint")
        if re.search(r"<(image|text|script|foreignObject)\b|href=", s): errs.append("forbidden element")
        if len(s.encode()) >= 4096: errs.append(f"{len(s.encode())} bytes")
        if len(re.findall(r'rx="9\.5" ry="11"', s)) != 2: errs.append("face: eyes not standard")
        if len(re.findall(r'r="5\.2"', s)) != 2: errs.append("face: pupils not standard")
        if errs: problems.append(f"{it['key']}: {', '.join(errs)}")
        else: ok += 1
print(f"ok {ok} · problems {len(problems)} · missing {len(missing)}")
for p in problems: print("  PROBLEM", p)
if missing: print("  MISSING", ", ".join(missing))
sys.exit(1 if problems or missing else 0)
