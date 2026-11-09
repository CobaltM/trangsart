"""Build an optimized static copy of trangsart for S3 + CloudFront.

Usage: python3 scripts/build_site.py <repo_dir> <out_dir>

- Copies the HTML pages, mapping each Express route in index.js to its file
  (/ -> index.html, /Events -> Events, /Contacts -> Contacts, ...).
- Copies assets/ as-is.
- Resizes every image the pages/CSS use to at most 2000px on the long
  side and saves it as WebP, rewriting the references in the HTML.
- Never modifies the repo itself.
"""
import os, re, shutil, sys
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
MAX_SIDE = 2000
QUALITY = 80

repo, out = sys.argv[1], sys.argv[2]
shutil.rmtree(out, ignore_errors=True)
os.makedirs(os.path.join(out, "images"))

# Read the Express routes from index.js, so new pages added there are picked up:
#   app.get('/Events', ...) res.render('Events.html') -> S3 key "Events" from views/Events.html
routes = {}
js = open(os.path.join(repo, "index.js"), encoding="utf-8").read()
for path, tpl in re.findall(r"app\.get\(\s*'([^']+)'.*?res\.render\(\s*'([^']+)'", js, re.S):
    key = "index.html" if path == "/" else path.lstrip("/")
    for cand in (os.path.join("views", tpl), tpl):
        if os.path.isfile(os.path.join(repo, cand)):
            routes[key] = cand
            break
    else:
        print(f"  skipping route {path}: template {tpl} not found")

shutil.copytree(os.path.join(repo, "assets"), os.path.join(out, "assets"),
                ignore=shutil.ignore_patterns("sass"))

converted = {}  # "images/x.png" -> "images/x.webp"

def convert(rel):
    if rel in converted:
        return converted[rel]
    src = os.path.join(repo, rel)
    if not os.path.isfile(src):
        print("  missing (left as-is):", rel)
        converted[rel] = rel
        return rel
    base = os.path.splitext(rel)[0]
    dst_rel = base + ".webp"
    im = Image.open(src)
    im.load()
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA" if "A" in im.getbands() or "transparency" in im.info else "RGB")
    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    im.save(os.path.join(out, dst_rel), "WEBP", quality=QUALITY, method=6)
    a, b = os.path.getsize(src), os.path.getsize(os.path.join(out, dst_rel))
    print(f"  {rel}: {a/1e6:.1f} MB -> {b/1e6:.2f} MB")
    converted[rel] = dst_rel
    return dst_rel

img_re = re.compile(r'(src|href)="(images/[^"]+)"')
for key, tpl in routes.items():
    html = open(os.path.join(repo, tpl), encoding="utf-8").read()
    html = img_re.sub(lambda m: f'{m.group(1)}="{convert(m.group(2))}"', html)
    # Load images only as the visitor scrolls to them.
    html = re.sub(r'<img (?![^>]*loading=)', '<img loading="lazy" decoding="async" ', html)
    # Express rendered with mustache; pages have no tags, but fill {{title}} just in case.
    html = html.replace("{{title}}", key.replace(".html", ""))
    with open(os.path.join(out, key), "w", encoding="utf-8") as f:
        f.write(html)

# Background images referenced from main.css (../../images/...)
css_path = os.path.join(out, "assets/css/main.css")
css = open(css_path, encoding="utf-8").read()
def css_sub(m):
    return f'url("../../{convert("images/" + m.group(1))}")'
css = re.sub(r'url\("\.\./\.\./images/([^"]+)"\)', css_sub, css)
open(css_path, "w", encoding="utf-8").write(css)

total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(out) for f in fs)
print(f"\nBuilt {len(routes)} pages, {len(converted)} images, {total/1e6:.0f} MB total -> {out}")
