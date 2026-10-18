"""Собирает логотипы, фавиконы и OG-картинку из исходников заказчика.

Запуск: python3 tools/make_assets.py <путь к Лого_Тропарево.svg> <путь к PNG логотипа>
"""
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "site"
IMG = ROOT / "assets" / "img"
GOLD = "#C2A566"
GREY = "#979697"
GREEN = (14, 33, 27)

src_svg, src_png = Path(sys.argv[1]), Path(sys.argv[2])
IMG.mkdir(parents=True, exist_ok=True)

raw = src_svg.read_text(encoding="utf-8")
paths = []
for m in re.finditer(r"<path(.*?)/>", raw, re.S):
    a = m.group(1)
    pid = int(re.search(r'id="path(\d+)"', a).group(1))
    d = re.search(r'\sd="([^"]*)"', a).group(1)
    fill = re.search(r'\bfill="([^"]*)"', a).group(1)
    stroke = re.search(r'\bstroke="([^"]*)"', a)
    tr = re.search(r'transform="([^"]*)"', a)
    paths.append((pid, d, fill, stroke.group(1) if stroke else None, tr.group(1) if tr else None))


def color(c):
    if c.startswith("rgb(76"):
        return GOLD
    if c.startswith("rgb(59"):
        return GREY
    if c.startswith("rgb(100"):
        return "#FFFFFF"
    return c


def build(ids, viewbox, grey=GREY, bg=None):
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}">']
    if bg:
        x, y, w, h = viewbox.split()
        out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{float(w) * 0.18:.0f}" fill="{bg}"/>')
    for pid, d, fill, stroke, tr in paths:
        if pid not in ids:
            continue
        d = re.sub(r"(\d+\.\d{2})\d+", r"\1", d)
        t = f' transform="{tr}"' if tr else ""
        if fill == "none":
            out.append(f'<path d="{d}" fill="none" stroke="{GOLD}" stroke-width="4" stroke-linecap="round"{t}/>')
        else:
            c = color(fill)
            if c == GREY:
                c = grey
            out.append(f'<path d="{d}" fill="{c}"{t}/>')
    out.append("</svg>")
    return "".join(out)


ALL = {p[0] for p in paths}
EMBLEM = {10, 11, 12, 13, 14}

(IMG / "logo.svg").write_text(build(ALL, "200 205 640 487"), encoding="utf-8")
(IMG / "logo-light.svg").write_text(build(ALL, "200 205 640 487", grey="#FFFFFF"), encoding="utf-8")
(IMG / "emblem.svg").write_text(build(EMBLEM, "205 205 628 300"), encoding="utf-8")
(ROOT / "favicon.svg").write_text(build(EMBLEM, "139 -24 760 760", bg="#0E211B"), encoding="utf-8")

png = Image.open(src_png).convert("RGBA")
px = png.load()
for y in range(png.height):
    for x in range(png.width):
        r, g, b, a = px[x, y]
        if a and abs(r - g) < 12 and abs(g - b) < 12 and r < 200:
            px[x, y] = (255, 255, 255, a)
logo_light = png.crop(png.getbbox())

scale = png.width / 1037.68
emblem = png.crop(tuple(round(v * scale) for v in (205, 205, 833, 505)))


def icon(size):
    canvas = Image.new("RGBA", (size, size), GREEN + (255,))
    e = emblem.copy()
    e.thumbnail((int(size * 0.78), int(size * 0.78)), Image.LANCZOS)
    canvas.alpha_composite(e, ((size - e.width) // 2, (size - e.height) // 2))
    return canvas


icon(180).convert("RGB").save(ROOT / "apple-touch-icon.png", optimize=True)
icon(512).convert("RGB").save(IMG / "icon-512.png", optimize=True)
icon(64).save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

og = Image.new("RGBA", (1200, 630), GREEN + (255,))
l = logo_light.copy()
l.thumbnail((560, 470), Image.LANCZOS)
og.alpha_composite(l, ((1200 - l.width) // 2, (630 - l.height) // 2))
og.convert("RGB").save(IMG / "og-image.jpg", quality=86, optimize=True, progressive=True)

print("ok:", sorted(p.name for p in IMG.iterdir()))
