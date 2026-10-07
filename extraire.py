#!/usr/bin/env python3
"""
extraire.py — sort les images base64 de ton index.html et prépare les données.

Utilisation (dans le dossier du site) :
    python extraire.py index.html            # images gardées dans leur format d'origine
    python extraire.py index.html --webp     # convertit en WebP léger (nécessite : pip install pillow)

Résultat :
    images/            une image par fichier
    data/sources.json  les sources (nom + couleur)
    data/personnages.json  les personnages (nom, source, lien wiki, images)
"""
import base64, html, json, pathlib, re, sys, unicodedata

args = [a for a in sys.argv[1:] if not a.startswith("--")]
to_webp = "--webp" in sys.argv
src_file = pathlib.Path(args[0] if args else "index.html")
text = src_file.read_text(encoding="utf-8")

if to_webp:
    try:
        from PIL import Image
        import io
    except ImportError:
        sys.exit("Pillow est nécessaire pour --webp : pip install pillow")

EXT = {"png": "png", "jpeg": "jpg", "jpg": "jpg", "webp": "webp", "gif": "gif"}
MAX_W = 900  # largeur max en cas de conversion WebP


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "image"


images_dir = pathlib.Path("images")
data_dir = pathlib.Path("data")
images_dir.mkdir(exist_ok=True)
data_dir.mkdir(exist_ok=True)

sources, persos, used = [], [], set()
blocks = re.split(r'<div class="source-block">', text)[1:]

for block in blocks:
    m = re.search(r'<div class="source-label"([^>]*)>(.*?)</div>', block, re.S)
    if not m:
        continue
    style = re.search(r'style="([^"]*)"', m.group(1))
    color = "#a855f7"
    if style:
        c = re.search(r"border:\s*1px solid\s*(#[0-9a-fA-F]{6})", style.group(1))
        if c:
            color = c.group(1).lower()
    src_name = html.unescape(re.sub(r"<[^>]+>", "", m.group(2))).strip()
    sources.append({"name": src_name, "color": color})

    cards = re.finditer(
        r'<img src="data:image/([\w.+-]+);base64,([^"]+)".*?<span class="char-name">(.*?)</span>',
        block, re.S)
    for c in cards:
        mime, b64, raw_name = c.groups()
        name = html.unescape(re.sub(r"<[^>]+>", "", raw_name)).strip()
        ext = EXT.get(mime.lower())
        if not ext:
            print(f"  ! format ignoré ({mime}) pour {name}")
            continue
        data = base64.b64decode(b64)
        base = slug(name)
        n = 1
        while f"{base}-{n}" in used:
            n += 1
        fname = f"{base}-{n}"
        used.add(fname)

        if to_webp:
            im = Image.open(io.BytesIO(data))
            if im.width > MAX_W:
                im = im.resize((MAX_W, round(im.height * MAX_W / im.width)))
            buf = io.BytesIO()
            im.save(buf, "WEBP", quality=80)
            data, ext = buf.getvalue(), "webp"

        (images_dir / f"{fname}.{ext}").write_bytes(data)
        persos.append({
            "name": name,
            "source": src_name,
            "wiki": "",
            "images": [{"src": f"/images/{fname}.{ext}", "nsfw": False}],
        })
        print(f"  ✓ {src_name} / {name} -> images/{fname}.{ext} ({len(data)//1024} Ko)")

(data_dir / "sources.json").write_text(json.dumps(sources, ensure_ascii=False, indent=2), encoding="utf-8")
(data_dir / "personnages.json").write_text(json.dumps(persos, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n{len(sources)} source(s), {len(persos)} personnage(s). Fichiers créés dans images/ et data/.")
