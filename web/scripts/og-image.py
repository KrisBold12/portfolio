"""Generate public/og.png, the 1200x630 card link unfurlers show.

Run when the name, the role line or the palette changes; the output is
committed, so this is not part of the build. There is no headless browser in
this project and adding one to draw a rectangle and three lines of text would
be the more fragile choice.

    python scripts/og-image.py

Colours are read from src/styles/tokens.css rather than repeated here, so the
card cannot drift away from the site it advertises.

Depends on Pillow, which is not a dependency of the web project. Use the
dog-breed virtualenv, which already has it:

    ../projects/dog-breed/.venv/Scripts/python.exe scripts/og-image.py
"""

import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
WEB = HERE.parent
TOKENS = WEB / "src" / "styles" / "tokens.css"
OUT = WEB / "public" / "og.png"

# 1200x630 is the size every unfurler crops to; anything else gets letterboxed
# or cropped by whichever platform is rendering it.
SIZE = (1200, 630)
MARGIN = 90

NAME = "Kristian Boldini"
ROLE = "Machine learning engineer"
LINE = "kb-portfolio.dev"


def token(name: str) -> str:
    """Read one custom property out of tokens.css."""
    css = TOKENS.read_text(encoding="utf-8")
    match = re.search(rf"^\s*--{re.escape(name)}:\s*(#[0-9a-fA-F]{{3,8}})", css, re.MULTILINE)
    if not match:
        raise SystemExit(f"--{name} not found in {TOKENS}")
    return match.group(1)


def font(names: list[str], size: int) -> ImageFont.FreeTypeFont:
    """First font that exists, so the script survives a different machine."""
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    raise SystemExit(f"none of {names} could be loaded")


def main() -> None:
    ink, bone, muted, signal = (token(n) for n in ("ink", "bone", "muted", "signal"))

    img = Image.new("RGB", SIZE, ink)
    draw = ImageDraw.Draw(img)

    # The favicon's mark: a triangle over a baseline, in the accent colour.
    # Repeated here so the tab icon and the link preview read as one thing.
    x, y, s = MARGIN, MARGIN, 84
    draw.polygon([(x, y), (x + s, y), (x + s / 2, y + s * 0.86)], fill=signal)
    draw.rounded_rectangle([x - 4, y + s * 0.94, x + s + 4, y + s * 0.94 + 10], 5, fill=signal)

    name_font = font(["arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf"], 92)
    role_font = font(["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"], 44)
    line_font = font(["consola.ttf", "Consolas.ttf", "DejaVuSansMono.ttf"], 32)

    draw.text((MARGIN, 300), NAME, font=name_font, fill=bone)
    draw.text((MARGIN, 412), ROLE, font=role_font, fill=muted)
    draw.text((MARGIN, SIZE[1] - MARGIN - 32), LINE, font=line_font, fill=signal)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"{OUT.relative_to(WEB)}  {SIZE[0]}x{SIZE[1]}  {OUT.stat().st_size // 1024} kB")


if __name__ == "__main__":
    main()
