"""Generate the 1200x630 cards link unfurlers show, one per route.

There is one card per entry in src/routes.ts rather than one for the site,
because `summary_large_image` gives the picture most of the preview: with a
single card every shared link previewed as the portfolio index, whichever page
it pointed at. The titles were already per route and it did not help, since
they are the line nobody reads.

Run when a name, a subtitle or the palette changes; the output is committed, so
this is not part of the build. There is no headless browser in this project and
adding one to draw a rectangle and three lines of text would be the more
fragile choice.

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
PUBLIC = WEB / "public"

# 1200x630 is the size every unfurler crops to; anything else gets letterboxed
# or cropped by whichever platform is rendering it.
SIZE = (1200, 630)
MARGIN = 90
LINE = "kb-portfolio.dev"

# Each filename must match an `ogImage` in src/routes.ts, and prerender.test.ts
# fails if one of them names a file that was never generated. The pairing is by
# hand because these run in different languages at different times; the test is
# what stops that from being a place to forget.
CARDS = [
    dict(out="og.png", title="Kristian Boldini", subtitle="Machine learning engineer"),
    dict(
        out="og-dog-breed.png",
        title="Calibrated dog breed classifier",
        subtitle="Kristian Boldini",
    ),
]

# The title sits on this baseline and grows upward when it wraps, so the
# subtitle and the footer stay where they are on every card and the set reads
# as one family rather than as two unrelated pictures.
TITLE_BASELINE = 300
TITLE_LEADING = 112
SUBTITLE_Y = 412
MAX_TITLE_LINES = 2


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


def wrap(draw: ImageDraw.ImageDraw, words: list[str], face: ImageFont.FreeTypeFont, width: int):
    """Greedy word wrap, or None if any line still overflows `width`."""
    lines: list[str] = [words[0]]
    for word in words[1:]:
        candidate = f"{lines[-1]} {word}"
        if draw.textlength(candidate, font=face) <= width:
            lines[-1] = candidate
        else:
            lines.append(word)

    if any(draw.textlength(line, font=face) > width for line in lines):
        return None
    return lines


def fit_title(draw: ImageDraw.ImageDraw, title: str, width: int):
    """The largest size at which the title fits the card in MAX_TITLE_LINES.

    Measured rather than chosen, because the sizes that fit depend on the font
    the machine happened to have, and a title that overflows is not an error
    Pillow reports: it draws past the margin and off the edge, and the card
    looks fine in the file listing.
    """
    names = ["arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf"]
    for size in range(92, 47, -6):
        face = font(names, size)
        lines = wrap(draw, title.split(), face, width)
        if lines is not None and len(lines) <= MAX_TITLE_LINES:
            return face, lines
    raise SystemExit(f"{title!r} does not fit {width}px in {MAX_TITLE_LINES} lines")


def card(spec: dict, palette: dict) -> Path:
    img = Image.new("RGB", SIZE, palette["ink"])
    draw = ImageDraw.Draw(img)

    # The favicon's mark: a triangle over a baseline, in the accent colour.
    # Repeated here so the tab icon and the link preview read as one thing.
    x, y, s = MARGIN, MARGIN, 84
    draw.polygon([(x, y), (x + s, y), (x + s / 2, y + s * 0.86)], fill=palette["signal"])
    draw.rounded_rectangle(
        [x - 4, y + s * 0.94, x + s + 4, y + s * 0.94 + 10], 5, fill=palette["signal"]
    )

    title_font, lines = fit_title(draw, spec["title"], SIZE[0] - 2 * MARGIN)
    sub_font = font(["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"], 44)
    line_font = font(["consola.ttf", "Consolas.ttf", "DejaVuSansMono.ttf"], 32)

    top = TITLE_BASELINE - (len(lines) - 1) * TITLE_LEADING
    for i, line in enumerate(lines):
        draw.text((MARGIN, top + i * TITLE_LEADING), line, font=title_font, fill=palette["bone"])

    draw.text((MARGIN, SUBTITLE_Y), spec["subtitle"], font=sub_font, fill=palette["muted"])
    draw.text((MARGIN, SIZE[1] - MARGIN - 32), LINE, font=line_font, fill=palette["signal"])

    out = PUBLIC / spec["out"]
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True)
    return out


def main() -> None:
    palette = {name: token(name) for name in ("ink", "bone", "muted", "signal")}

    for spec in CARDS:
        out = card(spec, palette)
        print(f"{out.relative_to(WEB)}  {SIZE[0]}x{SIZE[1]}  {out.stat().st_size // 1024} kB")


if __name__ == "__main__":
    main()
