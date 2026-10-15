"""Build an annotatable gallery of one hour's creatures: usage: python3 art-gallery.py batches.json OUT.html TITLE"""
import json
import sys

batches, out, title = json.load(open(sys.argv[1])), sys.argv[2], sys.argv[3]
total = sum(len(b["items"]) for b in batches)
sections = []
for b in batches:
    figs = "\n".join(
        f'  <figure data-annotate><img src="../foodi-dex/public/art/ingredients/{i["key"]}.svg" alt="{i["name"]}" loading="lazy">'
        f'<figcaption>{i["name"]}</figcaption></figure>' for i in b["items"])
    sections.append(f'<h2>{b["group"].capitalize()} <span>{len(b["items"])}</span></h2>\n<div class="grid">\n{figs}\n</div>')
html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  :root {{ --bg:#fbfaf7; --fg:#1d1c1a; --muted:#6b6760; }}
  @media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#161614; --fg:#ecebe7; --muted:#a09c93; }} }}
  :root[data-theme="dark"] {{ --bg:#161614; --fg:#ecebe7; --muted:#a09c93; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--bg); color:var(--fg); font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }}
  main {{ max-width:1100px; margin:0 auto; padding:36px 16px 80px; }}
  h1 {{ font-size:1.7rem; margin:0 0 6px; }} h2 {{ font-size:1.1rem; margin:28px 0 8px; }} h2 span {{ color:var(--muted); font-weight:400; }}
  .sub {{ color:var(--muted); margin:0 0 16px; font-size:.92rem; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill, minmax(118px, 1fr)); gap:10px; }}
  figure {{ margin:0; border-radius:12px; padding:10px 6px; text-align:center; background:#0a0a0a; }}
  figure img {{ width:96px; height:96px; display:block; margin:0 auto; }}
  figcaption {{ margin-top:4px; font-weight:600; font-size:.78rem; color:#e5e5e5; }}
</style>
</head>
<body>
<main>
<h1>{title}</h1>
<p class="sub">{total} creatures · shown on the app's dark background · click any one to ask for a change, then Copy All and paste it in the forge chat</p>
{chr(10).join(sections)}
</main>
</body>
</html>
"""
open(out, "w").write(html)
print(f"wrote {out}: {total} creatures in {len(batches)} groups")
