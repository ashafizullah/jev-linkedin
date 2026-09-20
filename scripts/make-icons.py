"""Generate extension icons: a score gauge ring on a dark rounded square."""

from math import cos, pi, sin
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
SIZES = [16, 32, 48, 128]
BG = (18, 32, 58, 255)
TRACK = (46, 66, 102, 255)
GAUGE = (56, 189, 248, 255)
ACCENT = (250, 204, 21, 255)
SWEEP = 288


def render(size: int) -> Image.Image:
    scale = 8
    canvas = size * scale
    img = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle(
        [(0, 0), (canvas - 1, canvas - 1)], radius=int(canvas * 0.22), fill=BG
    )

    pad = canvas * 0.2
    box = [pad, pad, canvas - pad, canvas - pad]
    width = max(scale, int(canvas * 0.085))

    draw.arc(box, start=135, end=135 + 360 - 90, fill=TRACK, width=width)
    draw.arc(box, start=135 + (360 - 90 - SWEEP), end=135 + 360 - 90, fill=GAUGE, width=width)

    r = (box[2] - box[0]) / 2
    cx = cy = canvas / 2
    angle = (135 + 360 - 90 - SWEEP) * pi / 180
    dot_r = width * 0.72
    draw.ellipse(
        [
            cx + (r - width / 2) * cos(angle) - dot_r,
            cy + (r - width / 2) * sin(angle) - dot_r,
            cx + (r - width / 2) * cos(angle) + dot_r,
            cy + (r - width / 2) * sin(angle) + dot_r,
        ],
        fill=ACCENT,
    )

    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(parents=True, exist_ok=True)
for size in SIZES:
    path = OUT / f"icon{size}.png"
    render(size).save(path)
    print(f"wrote {path.relative_to(OUT.parent)}")
